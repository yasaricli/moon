// Utils
import { trend } from "@/lib/stats";

// 14:05:09
export const fmtTime = (t) => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

// 14:05
export const fmtShort = (t) => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

// 24 Oct, 14:05
export const fmtDay = (t) =>
  new Date(t).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

// a duration in its two largest units: 5m, 2h 10m, 3d 4h
export const fmtDuration = (ms) => {
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${Math.max(min, 1)}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ${min % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
};

// a check's short label: its status code or the failure reason
export const codeLabel = (c) => (c.status ? String(c.status) : c.error || "error");

// the hero headline
export const headline = (total, down) => {
  if (!total) return "Nothing to watch yet";
  if (!down) return "All systems operational";
  if (down === total) return "Every monitor is down";
  return `${down} of ${total} monitors down`;
};

// a monitor's state from its checks: idle, down, slow or up
export const stateOf = (checks) => {
  const last = checks.at(-1);
  if (!last) return "idle";
  if (!last.ok) return "down";
  return trend(checks).state === "slow" ? "slow" : "up";
};

// overall uptime percentage of daily buckets
export const uptimeOf = (days) => {
  const count = days.reduce((a, d) => a + d.count, 0);
  return count ? (days.reduce((a, d) => a + d.ok, 0) / count) * 100 : 0;
};

// moves `from` into the slot of `to`
export const move = (ids, from, to) => {
  const next = ids.filter((id) => id !== from);
  next.splice(next.indexOf(to) + (ids.indexOf(from) < ids.indexOf(to) ? 1 : 0), 0, from);
  return next;
};
