import { RECENT, tone } from "../lib/stats.js";
import { fmtDay, codeLabel } from "../lib/live.js";
import s from "./ui.module.scss";

export default function StatusStrip({ checks, size = RECENT, tall }) {
  const shown = checks.slice(-size);
  const empty = size - shown.length;

  return (
    <div className={`${s.strip} ${tall ? s.stripTall : ""}`} role="img" aria-label={`Last ${shown.length} checks`}>
      {Array.from({ length: empty }, (_, i) => (
        <i key={`e${i}`} data-tone="idle" />
      ))}
      {shown.map((c) => (
        <i key={c.at} data-tone={tone(c)} title={`${fmtDay(c.at)} · ${codeLabel(c)} · ${c.ms} ms`} />
      ))}
    </div>
  );
}
