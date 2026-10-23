"use client";

import Link from "next/link";

// Components
import Logo from "@/components/Logo";
import MonitorDialog from "@/components/MonitorDialog";
import FullscreenButton from "@/components/FullscreenButton";

// Hooks
import useNow from "@/hooks/useNow";

// Store
import useLiveStore from "@/store/useLiveStore";

// Utils
import { INTERVAL_MS } from "@/lib/stats";
import { fmtTime } from "@/utils/shortcuts";

// Styles
import Styles from "./styles.module.scss";

const RING = 2 * Math.PI * 7;

// lastAt: newest check time, used to estimate when the next check fires.
const Header = ({ lastAt }) => {
  const connected = useLiveStore((state) => state.connected);
  const now = useNow();
  const elapsed = lastAt && now ? (now - lastAt) % INTERVAL_MS : 0;
  const left = Math.ceil((INTERVAL_MS - elapsed) / 1000);

  return (
    <header className={Styles.header}>
      <Logo href="/" />

      <div className={Styles.headerMeta}>
        <span className={Styles.metaItem} data-tone={connected ? "up" : "down"}>
          <i className="lamp" />
          {connected ? "Live" : "Offline"}
        </span>
        {!!lastAt && (
          <span className={Styles.metaItem} title="Next check">
            <svg viewBox="0 0 18 18" width="16" height="16" className={Styles.ring} aria-hidden="true">
              <circle cx="9" cy="9" r="7" />
              <circle cx="9" cy="9" r="7" strokeDasharray={RING} strokeDashoffset={RING * (1 - elapsed / INTERVAL_MS)} />
            </svg>
            <span className="num">next in {left}s</span>
          </span>
        )}
        <span className={`${Styles.clock} num`}>{now ? fmtTime(now) : "--:--:--"}</span>
        <Link href="/status" className={Styles.metaItem}>
          Status page
        </Link>
        <MonitorDialog />
        <FullscreenButton />
      </div>
    </header>
  );
};

export default Header;
