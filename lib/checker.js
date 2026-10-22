import { Agent, Headers, buildConnector, fetch } from "undici";
import { Monitor, Check } from "./models.js";
import { INTERVAL_MS } from "./stats.js";

const TIMEOUT_MS = 10_000;

function reason(err) {
  if (err.name === "TimeoutError") return "timeout";
  return err.cause?.code || err.message;
}

function requestHeaders(monitor) {
  const headers = new Headers({ "user-agent": "moon-monitor/1.0" });
  for (const h of monitor.headers || []) headers.set(h.key, h.value);
  if (monitor.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  return headers;
}

// A throwaway connection pool that remembers which IP each host connected to.
function tracingAgent() {
  const ips = new Map();
  const connect = buildConnector({ timeout: TIMEOUT_MS });
  const agent = new Agent({
    connect: (opts, cb) =>
      connect(opts, (err, socket) => {
        if (socket) ips.set(opts.hostname, socket.remoteAddress);
        cb(err, socket);
      }),
  });
  return { agent, ips };
}

// Times until response headers arrive (TTFB); the body is discarded.
async function probe(monitor) {
  const { agent, ips } = tracingAgent();
  const start = performance.now();
  const lastIp = () => [...ips.values()].at(-1) || "";
  try {
    const res = await fetch(monitor.url, {
      method: monitor.method || "GET",
      headers: requestHeaders(monitor),
      body: monitor.method === "POST" ? monitor.body || undefined : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      dispatcher: agent,
    });
    const ms = Math.round(performance.now() - start);
    res.body?.cancel();
    // after redirects, the IP of the host that actually answered
    const ip = ips.get(new URL(res.url).hostname) || lastIp();
    return { ms, status: res.status, ok: res.status < 400, error: "", ip };
  } catch (err) {
    return { ms: Math.round(performance.now() - start), status: 0, ok: false, error: reason(err), ip: lastIp() };
  } finally {
    agent.destroy().catch(() => {});
  }
}

export function toWire(c) {
  return { at: new Date(c.at).getTime(), ms: c.ms, status: c.status, ok: c.ok, error: c.error, ip: c.ip || "" };
}

export async function checkOne(monitor, io) {
  const result = await probe(monitor);
  const check = await Check.create({ monitor: monitor._id, at: new Date(), ...result });
  io.emit("check", { id: String(monitor._id), check: toWire(check) });
}

async function checkAll(io) {
  const monitors = await Monitor.find().lean();
  await Promise.allSettled(monitors.map((m) => checkOne(m, io)));
}

export function startChecker(io) {
  const run = () => checkAll(io).catch((err) => console.error("check run failed", err));
  run();
  setInterval(run, INTERVAL_MS);
}
