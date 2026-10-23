import { useEffect, useState } from "react";

// Utils
import { getSocket } from "@/utils/socket";

const REFRESH_MS = 5 * 60_000;

// Daily buckets for the status page come from the server; live checks update
// the current state and today's bucket in between refreshes.
const useStatus = () => {
  const [data, setData] = useState({ services: [], groups: [], loaded: false });
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    const load = () => {
      setConnected(true);
      socket.emit("status", ({ services, groups }) => setData({ services, groups, loaded: true }));
    };
    const onDisconnect = () => setConnected(false);
    const onCheck = ({ id, check }) =>
      setData((prev) => ({
        ...prev,
        services: prev.services.map((m) => {
          if (m.id !== id) return m;
          const today = m.days.at(-1);
          const days = [...m.days.slice(0, -1), { ...today, count: today.count + 1, ok: today.ok + (check.ok ? 1 : 0) }];
          return { ...m, last: check, days };
        }),
      }));

    if (socket.connected) load();
    socket.on("connect", load);
    socket.on("disconnect", onDisconnect);
    socket.on("monitors", load);
    socket.on("check", onCheck);
    const t = setInterval(load, REFRESH_MS);
    return () => {
      clearInterval(t);
      socket.off("connect", load);
      socket.off("disconnect", onDisconnect);
      socket.off("monitors", load);
      socket.off("check", onCheck);
    };
  }, []);

  return { ...data, connected };
};

export default useStatus;
