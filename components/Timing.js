import { PHASES } from "../lib/stats.js";
import s from "./ui.module.scss";

const LABEL = { redirect: "Redirects", dns: "DNS lookup", tcp: "TCP connect", tls: "TLS handshake", server: "Server response" };

function Bar({ phases, scale }) {
  const total = PHASES.reduce((sum, p) => sum + phases[p], 0);
  return (
    <div className={s.timingBar} style={{ width: `${Math.max((total / scale) * 100, 2)}%` }}>
      {PHASES.filter((p) => phases[p]).map((p) => (
        <i key={p} data-phase={p} style={{ flexGrow: phases[p] }} title={`${LABEL[p]} · ${phases[p]} ms`} />
      ))}
    </div>
  );
}

// Stacked bars for the latest check and the range average, scaled to the longer one.
export default function Timing({ last, avg }) {
  const total = (p) => (p ? PHASES.reduce((sum, k) => sum + p[k], 0) : 0);
  const scale = Math.max(total(last), total(avg), 1);
  const rows = [
    ["Last check", last],
    ["Average", avg],
  ].filter(([, p]) => p);

  return (
    <div className={s.timing}>
      {rows.map(([label, p]) => (
        <div key={label} className={s.timingRow}>
          <span className="label">{label}</span>
          <Bar phases={p} scale={scale} />
          <span className="num">{total(p)} ms</span>
        </div>
      ))}

      <span className={`label ${s.timingCaption}`}>{avg ? "Average per phase" : "Per phase"}</span>
      <ul className={s.timingLegend}>
        {PHASES.filter((p) => avg?.[p] || last?.[p]).map((p) => (
          <li key={p}>
            <i data-phase={p} />
            <span>{LABEL[p]}</span>
            <b className="num">{avg ? avg[p] : last[p]} ms</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
