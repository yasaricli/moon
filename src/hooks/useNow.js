import { useEffect, useState } from "react";

// The current time, refreshed every `every` ms; 0 until mounted so server and client render alike.
const useNow = (every = 1000) => {
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(t);
  }, [every]);

  return now;
};

export default useNow;
