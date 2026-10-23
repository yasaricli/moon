import { createServer } from "node:http";
import next from "next";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { MONGODB_URI, PORT } from "./lib/config.js";
import { Monitor, Check, Group } from "./lib/models.js";
import { startChecker, checkOne, toWire, certWire } from "./lib/checker.js";
import { RECENT, RANGES, INTERVAL_MS } from "./lib/stats.js";

const dev = process.argv.includes("--dev");
const app = next({ dev });

const ORDER = { order: 1, createdAt: 1 };

async function snapshot() {
  const monitors = await Monitor.find().sort(ORDER).lean();
  return Promise.all(
    monitors.map(async (m) => {
      const checks = await Check.find({ monitor: m._id }).sort({ at: -1 }).limit(RECENT).lean();
      return {
        id: String(m._id),
        name: m.name,
        group: m.group ? String(m.group) : "",
        url: m.url,
        method: m.method || "GET",
        // header values and body can hold secrets; only their shape leaves the server
        headerNames: (m.headers || []).map((h) => h.key),
        bodySize: (m.body || "").length,
        cert: certWire(m.cert),
        checks: checks.reverse().map(toWire),
      };
    }),
  );
}

async function groupList() {
  const groups = await Group.find().sort(ORDER).lean();
  return groups.map((g) => ({ id: String(g._id), name: g.name }));
}

const groupName = (name) => String(name || "").trim().slice(0, 40);

function parseUrl(raw) {
  try {
    const url = new URL(String(raw).trim());
    if (url.protocol === "http:" || url.protocol === "https:") return url;
  } catch {}
  return undefined;
}

function parseRequest({ method, headers, body }) {
  const verb = method === "POST" ? "POST" : "GET";
  const pairs = (Array.isArray(headers) ? headers : [])
    .map((h) => ({ key: String(h?.key || "").trim(), value: String(h?.value || "").trim() }))
    .filter((h) => h.key);
  try {
    new Headers(pairs.map((h) => [h.key, h.value]));
  } catch {
    return { error: "One of the headers is not valid." };
  }
  const text = verb === "POST" ? String(body || "").trim() : "";
  if (!text) return { method: verb, headers: pairs, body: "" };
  try {
    JSON.parse(text);
  } catch {
    return { error: "Request body must be valid JSON." };
  }
  return { method: verb, headers: pairs, body: text };
}

function parseMonitor({ name, group, url, ...request }) {
  const parsed = parseUrl(url);
  if (!parsed) return { error: "Enter a valid http(s) URL." };
  const req = parseRequest(request);
  if (req.error) return req;
  return {
    name: String(name || "").trim().slice(0, 60) || parsed.host,
    group: mongoose.isValidObjectId(group) ? group : null,
    url: parsed.href,
    ...req,
  };
}

// The browser never sees header values or the body, so on edit a blank
// header value or an empty body means "keep what is stored".
function withStored({ headers, body }, monitor) {
  const stored = new Map((monitor.headers || []).map((h) => [h.key, h.value]));
  return {
    headers: (Array.isArray(headers) ? headers : []).map((h) => ({
      key: h?.key,
      value: h?.value || stored.get(String(h?.key || "").trim()) || "",
    })),
    body: body || monitor.body,
  };
}

const DAY_MS = 86_400_000;
const STATUS_DAYS = 30; // checks expire after 30 days
let statusCache;

// Per-monitor daily uptime for the public status page. Only the origin of
// each URL leaves the server, for the favicon.
async function statusData() {
  if (statusCache && Date.now() - statusCache.at < INTERVAL_MS) return statusCache.data;
  const since = new Date().setUTCHours(0, 0, 0, 0) - (STATUS_DAYS - 1) * DAY_MS;
  const [groups, monitors, days] = await Promise.all([
    groupList(),
    Monitor.find().sort(ORDER).lean(),
    Check.aggregate([
      { $match: { at: { $gte: new Date(since) } } },
      {
        $group: {
          // UTC midnight in ms; $dateTrunc would need MongoDB 5
          _id: { monitor: "$monitor", day: { $subtract: [{ $toLong: "$at" }, { $mod: [{ $toLong: "$at" }, DAY_MS] }] } },
          count: { $sum: 1 },
          ok: { $sum: { $cond: ["$ok", 1, 0] } },
        },
      },
    ]),
  ]);
  const byKey = new Map(days.map((d) => [`${d._id.monitor}:${d._id.day}`, d]));
  const services = await Promise.all(
    monitors.map(async (m) => {
      const last = await Check.findOne({ monitor: m._id }).sort({ at: -1 }).lean();
      return {
        id: String(m._id),
        name: m.name,
        group: m.group ? String(m.group) : "",
        site: new URL(m.url).origin,
        last: last && toWire(last),
        days: Array.from({ length: STATUS_DAYS }, (_, i) => {
          const day = since + i * DAY_MS;
          const d = byKey.get(`${m._id}:${day}`);
          return { day, count: d?.count || 0, ok: d?.ok || 0 };
        }),
      };
    }),
  );
  const data = { groups, services };
  statusCache = { at: Date.now(), data };
  return data;
}

function wire(io) {
  const broadcast = async () => {
    statusCache = undefined;
    io.emit("monitors", await snapshot());
    io.emit("groups", await groupList());
  };

  io.on("connection", (socket) => {
    socket.on("list", async (ack) => ack(await snapshot()));
    socket.on("status", async (ack) => ack(await statusData()));
    socket.on("groups", async (ack) => ack(await groupList()));

    socket.on("group:add", async (name, ack) => {
      if (!groupName(name)) return ack({ error: "Give the tab a name." });
      const group = await Group.create({ name: groupName(name), order: await Group.countDocuments() });
      ack({ id: String(group._id) });
      await broadcast();
    });

    // monitors: every monitor id that belongs in the tab; a monitor is in one tab at most
    socket.on("group:save", async ({ id, name, monitors }, ack) => {
      if (!mongoose.isValidObjectId(id)) return ack({ error: "This tab no longer exists." });
      if (!groupName(name)) return ack({ error: "Give the tab a name." });
      const ids = (Array.isArray(monitors) ? monitors : []).filter((m) => mongoose.isValidObjectId(m));
      const { matchedCount } = await Group.updateOne({ _id: id }, { name: groupName(name) });
      if (!matchedCount) return ack({ error: "This tab no longer exists." });
      await Monitor.updateMany({ group: id, _id: { $nin: ids } }, { group: null });
      await Monitor.updateMany({ _id: { $in: ids } }, { group: id });
      ack({});
      await broadcast();
    });

    // the monitors stay, they just leave the tab
    socket.on("group:remove", async (id, ack) => {
      if (!mongoose.isValidObjectId(id)) return ack();
      await Promise.all([Group.deleteOne({ _id: id }), Monitor.updateMany({ group: id }, { group: null })]);
      ack();
      await broadcast();
    });

    socket.on("history", async ({ id, range }, ack) => {
      if (!mongoose.isValidObjectId(id) || !RANGES[range]) return ack([]);
      const since = new Date(Date.now() - RANGES[range]);
      const checks = await Check.find({ monitor: id, at: { $gte: since } }).sort({ at: 1 }).lean();
      ack(checks.map(toWire));
    });

    socket.on("add", async (data, ack) => {
      const fields = parseMonitor(data);
      if (fields.error) return ack(fields);
      // new monitors go to the end of the custom order
      const monitor = await Monitor.create({ ...fields, order: await Monitor.countDocuments() });
      ack({ id: String(monitor._id) });
      await broadcast();
      checkOne(monitor, io);
    });

    // Checks stay attached to the monitor id, so editing keeps the history.
    socket.on("edit", async (data, ack) => {
      const monitor = mongoose.isValidObjectId(data?.id) && (await Monitor.findById(data.id).lean());
      if (!monitor) return ack({ error: "This monitor no longer exists." });
      const fields = parseMonitor({ ...data, ...withStored(data, monitor) });
      if (fields.error) return ack(fields);
      // a different host serves a different certificate; the next check reads it
      const sameHost = new URL(fields.url).host === new URL(monitor.url).host;
      await Monitor.updateOne({ _id: monitor._id }, sameHost ? fields : { ...fields, $unset: { cert: 1 } });
      ack({ id: data.id });
      await broadcast();
      checkOne({ ...monitor, ...fields }, io);
    });

    // ids: every monitor id in the new custom order
    socket.on("reorder", async (ids, ack) => {
      if (!Array.isArray(ids) || !ids.every((id) => mongoose.isValidObjectId(id))) return ack();
      await Monitor.bulkWrite(ids.map((id, order) => ({ updateOne: { filter: { _id: id }, update: { order } } })));
      await broadcast();
      ack();
    });

    socket.on("remove", async (id, ack) => {
      if (!mongoose.isValidObjectId(id)) return ack();
      await Promise.all([Monitor.deleteOne({ _id: id }), Check.deleteMany({ monitor: id })]);
      ack();
      await broadcast();
    });
  });
}

await mongoose.connect(MONGODB_URI);
await app.prepare();

const server = createServer(app.getRequestHandler());
const io = new Server(server);
wire(io);
startChecker(io);

server.listen(PORT, "0.0.0.0", () => console.log(`moon ready on :${PORT}`));
