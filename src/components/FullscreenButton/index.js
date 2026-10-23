"use client";

import { useEffect, useState } from "react";

// Styles
import Styles from "./styles.module.scss";

const FullscreenButton = () => {
  const [full, setFull] = useState(false);

  useEffect(() => {
    const sync = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggle = () => {
    if (document.fullscreenElement) return document.exitFullscreen();
    document.documentElement.requestFullscreen();
  };

  const label = full ? "Exit full screen" : "Full screen";
  return (
    <button type="button" className={Styles.iconButton} onClick={toggle} aria-label={label} title={label}>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        {full ? (
          <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
        ) : (
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        )}
      </svg>
    </button>
  );
};

export default FullscreenButton;
