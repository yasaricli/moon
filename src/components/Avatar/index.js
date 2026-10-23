"use client";

import { useState } from "react";

// Styles
import Styles from "./styles.module.scss";

const Avatar = ({ url, name, size = 32 }) => {
  const [failed, setFailed] = useState(false);

  return (
    <span className={Styles.avatar} style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {failed ? (
        name[0]?.toUpperCase()
      ) : (
        <img src={new URL("/favicon.ico", url).href} alt="" onError={() => setFailed(true)} />
      )}
    </span>
  );
};

export default Avatar;
