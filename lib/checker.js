import dns from "node:dns";
import net from "node:net";
import tls from "node:tls";
import { Agent, Headers, fetch } from "undici";
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

// Opens each connection itself so DNS, TCP and TLS can be timed separately.
// Times are ms since the probe started; `conns` is keyed by host.
function tracingAgent(start) {
  const conns = new Map();
  const since = () => performance.now() - start;

  function connect(opts, cb) {
    const host = opts.hostname.replace(/^\[|\]$/g, "");
    const secure = opts.protocol === "https:";
    const at = since();
    const conn = { ip: "", start: at, dns: at, tcp: 0, tls: 0, cert: undefined };
    conns.set(host, conn);

    const lookup = (name, options, done) =>
      dns.lookup(name, options, (...args) => {
        conn.dns = since();
        done(...args);
      });
    const port = Number(opts.port) || (secure ? 443 : 80);
    const socket = secure
      ? tls.connect({ host, port, lookup, ALPNProtocols: ["http/1.1"], ...(net.isIP(host) ? {} : { servername: host }) })
      : net.connect({ host, port, lookup });

    let settled = false;
    function finish(err) {
      if (settled) return;
      settled = true;
      socket.setTimeout(0);
      socket.off("error", finish);
      if (!err) return cb(null, socket);
      socket.destroy();
      cb(err);
    }

    socket.setTimeout(TIMEOUT_MS, () => finish(Object.assign(new Error("connect timeout"), { code: "ETIMEDOUT" })));
    socket.once("error", finish);
    socket.once("connect", () => {
      conn.tcp = since();
      conn.ip = socket.remoteAddress;
      if (!secure) finish();
    });
    if (secure) {
      socket.once("secureConnect", () => {
        conn.tls = since();
        conn.cert = socket.getPeerCertificate();
        finish();
      });
    }
  }

  return { agent: new Agent({ connect }), conns };
}

// Where the time went for the connection that answered, in ms. Without a
// redirect, the few ms before the socket opens are counted as DNS.
function phases(conn, ms, redirected) {
  const ready = conn.tls || conn.tcp;
  const before = redirected ? conn.start : 0;
  return {
    redirect: Math.round(before),
    dns: Math.round(conn.dns - before),
    tcp: Math.round(conn.tcp - conn.dns),
    tls: conn.tls ? Math.round(conn.tls - conn.tcp) : 0,
    server: Math.max(0, Math.round(ms - ready)),
  };
}

function certInfo(cert) {
  if (!cert?.valid_to) return undefined;
  return {
    subject: cert.subject?.CN || "",
    issuer: cert.issuer?.O || cert.issuer?.CN || "",
    expires: new Date(cert.valid_to),
  };
}

// Times until response headers arrive (TTFB); the body is discarded.
async function probe(monitor) {
  const start = performance.now();
  const { agent, conns } = tracingAgent(start);
  const last = () => [...conns.values()].at(-1);
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
    // after redirects, the connection of the host that actually answered
    const conn = conns.get(new URL(res.url).hostname.replace(/^\[|\]$/g, "")) || last();
    return {
      check: { ms, status: res.status, ok: res.status < 400, error: "", ip: conn?.ip || "", phases: conn && phases(conn, ms, res.redirected) },
      cert: certInfo(conn?.cert),
    };
  } catch (err) {
    const ms = Math.round(performance.now() - start);
    return { check: { ms, status: 0, ok: false, error: reason(err), ip: last()?.ip || "" } };
  } finally {
    agent.destroy().catch(() => {});
  }
}

export function toWire(c) {
  return {
    at: new Date(c.at).getTime(),
    ms: c.ms,
    status: c.status,
    ok: c.ok,
    error: c.error,
    ip: c.ip || "",
    // checks stored before timing existed have no phases
    phases: c.phases?.server >= 0 ? { ...c.phases } : undefined,
  };
}

export function certWire(cert) {
  if (!cert?.expires) return undefined;
  return { subject: cert.subject, issuer: cert.issuer, expires: new Date(cert.expires).getTime() };
}

export async function checkOne(monitor, io) {
  const { check: result, cert } = await probe(monitor);
  const check = await Check.create({ monitor: monitor._id, at: new Date(), ...result });
  if (cert) await Monitor.updateOne({ _id: monitor._id }, { cert });
  io.emit("check", { id: String(monitor._id), check: toWire(check.toObject()), cert: certWire(cert) });
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
