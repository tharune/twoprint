import { useMemo } from "react";

interface Props {
  values: number[];
  width?: number;
  height?: number;
  /** "auto" is green when the last value is at or above the first, red when below. */
  tone?: "auto" | "brand";
  /** Marks the last point with a dot, for a line whose end is the live price. */
  live?: boolean;
}

/** A tiny line for a table row: no axes, no labels, just the shape. The row says what it is. */
export function Sparkline({ values, width = 96, height = 28, tone = "auto", live = false }: Props) {
  const g = useMemo(() => {
    if (values.length < 2) return null;
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const span = hi - lo || 1;
    const pad = 2;
    const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (width - pad * 2), pad + (1 - (v - lo) / span) * (height - pad * 2)] as const);
    const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
    const [lx, ly] = pts[pts.length - 1];
    return { d, area: `${d}L${lx.toFixed(1)} ${height}L${pts[0][0].toFixed(1)} ${height}Z`, lx, ly, up: values[values.length - 1] >= values[0] };
  }, [values, width, height]);
  if (!g) return <span className="spark spark--empty" style={{ width, height }} aria-hidden="true" />;
  const cls = tone === "brand" ? "spark" : g.up ? "spark spark--up" : "spark spark--down";
  return (
    <svg className={cls} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
      <path className="spark__area" d={g.area} />
      <path className="spark__line" d={g.d} />
      {live && <circle className="spark__dot" cx={g.lx} cy={g.ly} r={2.5} />}
    </svg>
  );
}
