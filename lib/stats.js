// Shared by server.js and the browser.

export const INTERVAL_MS = 60_000;
export const RECENT = 90;
export const RANGES = { "1h": 3_600_000, "24h": 86_400_000, "7d": 604_800_000 };

const SLOW = 1.5;
const FAST = 0.8;

export function percentile(xs, p) {
  if (!xs.length) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

export function summarize(checks) {
  const ms = checks.filter((c) => c.ok).map((c) => c.ms);
  const sum = ms.reduce((a, b) => a + b, 0);
  return {
    count: checks.length,
    uptime: checks.length ? (ms.length / checks.length) * 100 : 0,
    avg: ms.length ? Math.round(sum / ms.length) : 0,
    p95: percentile(ms, 95),
    min: ms.length ? Math.min(...ms) : 0,
    max: ms.length ? Math.max(...ms) : 0,
  };
}

// Compares the latest check to the median of the hour before it.
export function trend(checks) {
  const last = checks.at(-1);
  if (!last) return { state: "idle", delta: 0 };
  if (!last.ok) return { state: "down", delta: 0 };
  const prev = checks.slice(-61, -1).filter((c) => c.ok).map((c) => c.ms);
  if (!prev.length) return { state: "normal", delta: 0 };
  const base = percentile(prev, 50) || 1;
  const delta = Math.round(((last.ms - base) / base) * 100);
  const state = last.ms > base * SLOW ? "slow" : last.ms < base * FAST ? "fast" : "normal";
  return { state, delta };
}

export function codes(checks) {
  const counts = {};
  for (const c of checks) counts[c.status] = (counts[c.status] || 0) + 1;
  return Object.entries(counts)
    .map(([status, count]) => ({ status: Number(status), count }))
    .sort((a, b) => b.count - a.count);
}

// Consecutive failed checks collapse into one incident.
export function incidents(checks) {
  const out = [];
  let open;
  for (const c of checks) {
    if (c.ok) {
      if (open) open.end = c.at;
      open = undefined;
      continue;
    }
    if (open) {
      open.count++;
      continue;
    }
    open = { start: c.at, end: 0, count: 1, status: c.status, error: c.error };
    out.push(open);
  }
  return out.reverse();
}

// Buckets a long series down to `max` points for drawing.
export function downsample(checks, max) {
  if (checks.length <= max) return checks;
  const size = Math.ceil(checks.length / max);
  const out = [];
  for (let i = 0; i < checks.length; i += size) {
    const bucket = checks.slice(i, i + size);
    const ups = bucket.filter((c) => c.ok);
    const worst = bucket.find((c) => !c.ok);
    out.push({
      at: bucket[0].at,
      ms: ups.length ? Math.round(ups.reduce((a, c) => a + c.ms, 0) / ups.length) : 0,
      ok: !worst,
      status: worst ? worst.status : bucket.at(-1).status,
      error: worst ? worst.error : "",
    });
  }
  return out;
}

export function tone(check) {
  if (!check) return "idle";
  if (!check.status || check.status >= 500) return "down";
  if (check.status >= 400) return "warn";
  if (check.status >= 300) return "info";
  return "up";
}

export const PHASES = ["redirect", "dns", "tcp", "tls", "server"];

// Mean of each timing phase over the checks that recorded timing.
export function avgPhases(checks) {
  const timed = checks.filter((c) => c.phases);
  if (!timed.length) return undefined;
  return Object.fromEntries(
    PHASES.map((p) => [p, Math.round(timed.reduce((sum, c) => sum + (c.phases[p] || 0), 0) / timed.length)]),
  );
}

export const certDays = (cert, now) => Math.floor((cert.expires - now) / 86_400_000);

export function certTone(days) {
  if (days <= 7) return "down";
  if (days <= 21) return "warn";
  return "up";
}
