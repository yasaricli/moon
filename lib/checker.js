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

// Times until response headers arrive (TTFB); the body is discarded.
async function probe(monitor) {
  const start = performance.now();
  try {
    const res = await fetch(monitor.url, {
      method: monitor.method || "GET",
      headers: requestHeaders(monitor),
      body: monitor.method === "POST" ? monitor.body || undefined : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const ms = Math.round(performance.now() - start);
    res.body?.cancel();
    return { ms, status: res.status, ok: res.status < 400, error: "" };
  } catch (err) {
    return { ms: Math.round(performance.now() - start), status: 0, ok: false, error: reason(err) };
  }
}

export function toWire(c) {
  return { at: new Date(c.at).getTime(), ms: c.ms, status: c.status, ok: c.ok, error: c.error };
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
