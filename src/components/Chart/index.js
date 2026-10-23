"use client";

import { useEffect, useRef, useState } from "react";

// Utils
import { summarize } from "@/lib/stats";
import { paths } from "@/utils/chart";
import { fmtShort, fmtDay, codeLabel } from "@/utils/shortcuts";

// Styles
import Styles from "./styles.module.scss";

const PAD = { l: 56, r: 20, t: 20, b: 32 };
const TICKS = 4;

const niceStep = (max) => {
  const raw = max / TICKS;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
};

const Chart = ({ checks, from, to, height = 300 }) => {
  const ref = useRef();
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState(-1);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const w = Math.max(width - PAD.l - PAD.r, 1);
  const h = height - PAD.t - PAD.b;
  const base = PAD.t + h;
  const { avg, p95, max } = summarize(checks);
  const step = niceStep(Math.max(max, 50) * 1.1);
  const top = step * TICKS;
  const x = (t) => PAD.l + ((t - from) / (to - from)) * w;
  const y = (ms) => base - (ms / top) * h;

  const pts = checks.map((c) => ({ ...c, x: x(c.at), y: y(c.ms) }));
  const { line, area } = paths(pts, base);
  const barW = Math.max(2, w / Math.max(checks.length, 60));
  const span = to - from;
  const fmtX = span > 86_400_000 ? fmtDay : fmtShort;
  const last = pts.findLast((p) => p.ok);
  const hp = pts[hover];

  const onMove = (e) => {
    if (!pts.length) return;
    const mx = e.clientX - e.currentTarget.getBoundingClientRect().left;
    let best = 0;
    pts.forEach((p, i) => {
      if (Math.abs(p.x - mx) < Math.abs(pts[best].x - mx)) best = i;
    });
    setHover(best);
  };

  return (
    <div ref={ref} className={Styles.chart} style={{ height }}>
      {!!width && (
        <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(-1)}>
          {Array.from({ length: TICKS + 1 }, (_, i) => (
            <g key={i}>
              <line x1={PAD.l} x2={PAD.l + w} y1={y(i * step)} y2={y(i * step)} className={Styles.grid} />
              <text x={PAD.l - 10} y={y(i * step)} className={Styles.axis} textAnchor="end" dominantBaseline="middle">
                {i * step} ms
              </text>
            </g>
          ))}
          {Array.from({ length: 5 }, (_, i) => {
            const t = from + (span * i) / 4;
            return (
              <text key={i} x={x(t)} y={height - 8} className={Styles.axis} textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"}>
                {fmtX(t)}
              </text>
            );
          })}

          {pts.map((p) =>
            p.ok ? null : <rect key={p.at} x={p.x - barW / 2} y={PAD.t} width={barW} height={h} className={Styles.outage} />,
          )}

          <path d={area} fill="url(#glow-fill)" />
          <path d={line} className={Styles.line} />

          {!!avg && (
            <g className={Styles.ref}>
              <line x1={PAD.l} x2={PAD.l + w} y1={y(avg)} y2={y(avg)} />
              <text x={PAD.l + 8} y={y(avg) - 6}>avg {avg} ms</text>
            </g>
          )}
          {!!p95 && p95 !== avg && (
            <g className={Styles.ref} data-tone="warn">
              <line x1={PAD.l} x2={PAD.l + w} y1={y(p95)} y2={y(p95)} />
              <text x={PAD.l + w} y={y(p95) - 6} textAnchor="end">p95 {p95} ms</text>
            </g>
          )}

          {last && <circle cx={last.x} cy={last.y} r="4" className={Styles.pulse} />}

          {hp && (
            <g pointerEvents="none">
              <line x1={hp.x} x2={hp.x} y1={PAD.t} y2={base} className={Styles.cross} />
              <circle cx={hp.x} cy={hp.ok ? hp.y : base} r="5" className={Styles.dot} data-tone={hp.ok ? "up" : "down"} />
            </g>
          )}
        </svg>
      )}

      {hp && (
        <div className={Styles.tip} style={{ left: hp.x, transform: `translateX(${hp.x > width - 160 ? "-105%" : "8%"})` }}>
          <div className="label">{fmtDay(hp.at)}</div>
          <div className="num" data-tone={hp.ok ? "up" : "down"}>
            <b>{hp.ok ? `${hp.ms} ms` : "DOWN"}</b> · {codeLabel(hp)}
          </div>
        </div>
      )}

      {!checks.length && <div className={Styles.chartEmpty}>Waiting for data…</div>}
    </div>
  );
};

export default Chart;
