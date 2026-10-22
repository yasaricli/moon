import { createServer } from "node:http";
import next from "next";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { MONGODB_URI, PORT } from "./lib/config.js";
import { Monitor, Check } from "./lib/models.js";
import { startChecker, checkOne, toWire, certWire } from "./lib/checker.js";
import { RECENT, RANGES } from "./lib/stats.js";

const dev = process.argv.includes("--dev");
const app = next({ dev });

async function snapshot() {
  const monitors = await Monitor.find().sort({ createdAt: 1 }).lean();
  return Promise.all(
    monitors.map(async (m) => {
      const checks = await Check.find({ monitor: m._id }).sort({ at: -1 }).limit(RECENT).lean();
      return {
        id: String(m._id),
        name: m.name,
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

function wire(io) {
  const broadcast = async () => io.emit("monitors", await snapshot());

  io.on("connection", (socket) => {
    socket.on("list", async (ack) => ack(await snapshot()));

    socket.on("history", async ({ id, range }, ack) => {
      if (!mongoose.isValidObjectId(id) || !RANGES[range]) return ack([]);
      const since = new Date(Date.now() - RANGES[range]);
      const checks = await Check.find({ monitor: id, at: { $gte: since } }).sort({ at: 1 }).lean();
      ack(checks.map(toWire));
    });

    socket.on("add", async ({ name, url, ...request }, ack) => {
      const parsed = parseUrl(url);
      if (!parsed) return ack({ error: "Enter a valid http(s) URL." });
      const req = parseRequest(request);
      if (req.error) return ack(req);
      const monitor = await Monitor.create({
        name: String(name || "").trim().slice(0, 60) || parsed.host,
        url: parsed.href,
        ...req,
      });
      ack({ id: String(monitor._id) });
      await broadcast();
      checkOne(monitor, io);
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
