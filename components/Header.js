"use client";

import Link from "next/link";
import { INTERVAL_MS } from "../lib/stats.js";
import { useNow, fmtTime } from "../lib/live.js";
import Moon from "./Moon.js";
import AddMonitor from "./AddMonitor.js";
import FullscreenButton from "./FullscreenButton.js";
import s from "./ui.module.scss";

const RING = 2 * Math.PI * 7;

// lastAt: newest check time, used to estimate when the next check fires.
export default function Header({ connected, lastAt }) {
  const now = useNow();
  const elapsed = lastAt && now ? (now - lastAt) % INTERVAL_MS : 0;
  const left = Math.ceil((INTERVAL_MS - elapsed) / 1000);

  return (
    <header className={s.header}>
      <Link href="/" className={s.logo}>
        <Moon phase={0.32} size={22} />
        <span>moon</span>
      </Link>

      <div className={s.headerMeta}>
        <span className={s.metaItem} data-tone={connected ? "up" : "down"}>
          <i className="lamp" />
          {connected ? "Live" : "Offline"}
        </span>
        {!!lastAt && (
          <span className={s.metaItem} title="Next check">
            <svg viewBox="0 0 18 18" width="16" height="16" className={s.ring} aria-hidden="true">
              <circle cx="9" cy="9" r="7" />
              <circle cx="9" cy="9" r="7" strokeDasharray={RING} strokeDashoffset={RING * (1 - elapsed / INTERVAL_MS)} />
            </svg>
            <span className="num">next in {left}s</span>
          </span>
        )}
        <span className={`${s.clock} num`}>{now ? fmtTime(now) : "--:--:--"}</span>
        <Link href="/status" className={s.metaItem}>
          Status page
        </Link>
        <AddMonitor />
        <FullscreenButton />
      </div>
    </header>
  );
}
