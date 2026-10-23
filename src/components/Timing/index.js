// Utils
import { PHASES } from "@/lib/stats";

// Styles
import Styles from "./styles.module.scss";

const LABEL = { redirect: "Redirects", dns: "DNS lookup", tcp: "TCP connect", tls: "TLS handshake", server: "Server response" };

const totalOf = (phases) => (phases ? PHASES.reduce((sum, k) => sum + phases[k], 0) : 0);

const Bar = ({ phases, scale }) => (
  <div className={Styles.timingBar} style={{ width: `${Math.max((totalOf(phases) / scale) * 100, 2)}%` }}>
    {PHASES.filter((p) => phases[p]).map((p) => (
      <i key={p} data-phase={p} style={{ flexGrow: phases[p] }} title={`${LABEL[p]} · ${phases[p]} ms`} />
    ))}
  </div>
);

// Stacked bars for the latest check and the range average, scaled to the longer one.
const Timing = ({ last, avg }) => {
  const scale = Math.max(totalOf(last), totalOf(avg), 1);
  const rows = [
    ["Last check", last],
    ["Average", avg],
  ].filter(([, p]) => p);

  return (
    <div className={Styles.timing}>
      {rows.map(([label, p]) => (
        <div key={label} className={Styles.timingRow}>
          <span className="label">{label}</span>
          <Bar phases={p} scale={scale} />
          <span className="num">{totalOf(p)} ms</span>
        </div>
      ))}

      <span className={`label ${Styles.timingCaption}`}>{avg ? "Average per phase" : "Per phase"}</span>
      <ul className={Styles.timingLegend}>
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
};

export default Timing;
