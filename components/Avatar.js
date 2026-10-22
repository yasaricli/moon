"use client";

import { useState } from "react";
import s from "./ui.module.scss";

export default function Avatar({ url, name, size = 32 }) {
  const [failed, setFailed] = useState(false);

  return (
    <span className={s.avatar} style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {failed ? (
        name[0]?.toUpperCase()
      ) : (
        <img src={new URL("/favicon.ico", url).href} alt="" onError={() => setFailed(true)} />
      )}
    </span>
  );
}
