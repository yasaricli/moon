// Uptime 90% or lower is a new moon, 100% is a full moon.
export const phaseOf = (uptime) => Math.min(Math.max((uptime - 90) / 10, 0), 1);

export default function Moon({ phase, size = 20, className }) {
  const r = 10;
  const rx = r * Math.abs(1 - 2 * phase);
  const lit = `M0,${-r}A${r},${r} 0 0 1 0,${r}A${rx},${r} 0 0 ${phase > 0.5 ? 1 : 0} 0,${-r}Z`;

  return (
    <svg viewBox="-11 -11 22 22" width={size} height={size} className={className} aria-hidden="true">
      <circle r={r} fill="var(--moon-dark)" stroke="var(--moon)" strokeOpacity=".18" strokeWidth=".6" />
      <path d={lit} fill="var(--moon)" />
    </svg>
  );
}
