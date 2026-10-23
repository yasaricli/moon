import { useEffect, useState } from "react";

// Utils
import { RANGES } from "@/lib/stats";
import { getSocket } from "@/utils/socket";

// Checks of one monitor over a range, extended live as new checks arrive.
const useHistory = (id, range) => {
  const [state, setState] = useState({ checks: [], to: 0 });

  useEffect(() => {
    const socket = getSocket();
    const load = () => socket.emit("history", { id, range }, (checks) => setState({ checks, to: Date.now() }));
    const onCheck = (e) => {
      if (e.id !== id) return;
      setState(({ checks }) => {
        const to = e.check.at;
        return { checks: [...checks.filter((c) => c.at >= to - RANGES[range]), e.check], to };
      });
    };

    load();
    socket.on("connect", load);
    socket.on("check", onCheck);
    return () => {
      socket.off("connect", load);
      socket.off("check", onCheck);
    };
  }, [id, range]);

  return state;
};

export default useHistory;
