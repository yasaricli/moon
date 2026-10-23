// Utils
import { RECENT, tone } from "@/lib/stats";
import { fmtDay, codeLabel } from "@/utils/shortcuts";

// Styles
import Styles from "./styles.module.scss";

// One block per check, padded with idle blocks up to `size`.
const StatusStrip = ({ checks, size = RECENT, tall }) => {
  const shown = checks.slice(-size);
  const empty = size - shown.length;

  return (
    <div className={`${Styles.strip} ${tall ? Styles.stripTall : ""}`} role="img" aria-label={`Last ${shown.length} checks`}>
      {Array.from({ length: empty }, (_, i) => (
        <i key={`e${i}`} data-tone="idle" />
      ))}
      {shown.map((c) => (
        <i key={c.at} data-tone={tone(c)} title={`${fmtDay(c.at)} · ${codeLabel(c)} · ${c.ms} ms${c.ip ? ` · ${c.ip}` : ""}`} />
      ))}
    </div>
  );
};

export default StatusStrip;
