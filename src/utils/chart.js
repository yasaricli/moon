// Splits points at failed checks so the line never bridges an outage.
export const paths = (pts, base) => {
  const segs = [];
  let seg;
  for (const p of pts) {
    if (!p.ok) {
      seg = undefined;
      continue;
    }
    if (!seg) segs.push((seg = []));
    seg.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  return {
    line: segs.map((g) => `M${g.join("L")}`).join(""),
    area: segs.map((g) => `M${g[0].split(",")[0]},${base}L${g.join("L")}L${g.at(-1).split(",")[0]},${base}Z`).join(""),
  };
};
