import { RECENT } from "../lib/stats.js";
import { paths } from "./Chart.js";
import s from "./ui.module.scss";

const H = 56;

// Index-based mini chart; viewBox stretches, strokes stay crisp.
export default function Sparkline({ checks }) {
  const max = Math.max(...checks.filter((c) => c.ok).map((c) => c.ms), 1) * 1.2;
  const offset = RECENT - checks.length;
  const pts = checks.map((c, i) => ({ ...c, x: offset + i, y: H - (c.ms / max) * H }));
  const { line, area } = paths(pts, H);

  return (
    <svg className={s.spark} viewBox={`0 0 ${RECENT - 1} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      {pts.map((p) =>
        p.ok ? null : <rect key={p.at} x={p.x - 0.5} y="0" width="1" height={H} className={s.sparkOutage} />,
      )}
      <path d={area} fill="url(#glow-fill)" />
      <path d={line} className={s.sparkLine} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
