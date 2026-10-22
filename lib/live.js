"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { RECENT } from "./stats.js";

let socket;
export function getSocket() {
  socket ||= io();
  return socket;
}

export function useMonitors() {
  const [monitors, setMonitors] = useState();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = getSocket();
    const load = () => {
      setConnected(true);
      s.emit("list", setMonitors);
    };
    const onDisconnect = () => setConnected(false);
    const onCheck = ({ id, check }) =>
      setMonitors((list) =>
        list?.map((m) => (m.id === id ? { ...m, checks: [...m.checks, check].slice(-RECENT) } : m)),
      );

    if (s.connected) load();
    s.on("connect", load);
    s.on("disconnect", onDisconnect);
    s.on("monitors", setMonitors);
    s.on("check", onCheck);
    return () => {
      s.off("connect", load);
      s.off("disconnect", onDisconnect);
      s.off("monitors", setMonitors);
      s.off("check", onCheck);
    };
  }, []);

  return { monitors, connected };
}

export function useNow(every = 1000) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(t);
  }, [every]);
  return now;
}

export const fmtTime = (t) => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
export const fmtShort = (t) => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
export const fmtDay = (t) =>
  new Date(t).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function fmtDuration(ms) {
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${Math.max(min, 1)}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ${min % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export const codeLabel = (c) => (c.status ? String(c.status) : c.error || "error");
