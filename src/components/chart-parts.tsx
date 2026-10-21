// The pieces the price charts share, so the landing strip and the trade chart read as one system: gridlines with round labels,
// a baseline with print numbers, and a value tag in the right gutter. Styles are in styles/chart.css.

/** Horizontal gridlines, each labelled in the right gutter. A label that would sit under a tag (`avoid`, as y positions) is left off. */
export function YAxis({ ticks, y, x0, x1, label, avoid = [] }: { ticks: number[]; y: (v: number) => number; x0: number; x1: number; label: (v: number) => string; avoid?: number[] }) {
  return (
    <g className="chart__grid">
      {ticks.map((v) => {
        const py = y(v);
        return (
          <g key={v}>
            <line x1={x0} x2={x1} y1={py} y2={py} />
            {!avoid.some((a) => Math.abs(a - py) < 18) && (
              <text x={x1 + 10} y={py + 4}>
                {label(v)}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** A hairline along the foot of the plot, with a small tick and a number at each position given. */
export function XAxis({ items, y, x0, x1 }: { items: { x: number; label: string }[]; y: number; x0: number; x1: number }) {
  return (
    <g className="chart__axis">
      <line className="chart__baseline" x1={x0} x2={x1} y1={y} y2={y} />
      {items.map((s) => (
        <g key={s.label}>
          <line x1={s.x} x2={s.x} y1={y} y2={y + 4} />
          <text x={s.x} y={y + 17} textAnchor="middle">
            {s.label}
          </text>
        </g>
      ))}
    </g>
  );
}

export type PillTone = "ink" | "ref" | "level";

/** A value tag sitting on its line in the right gutter: solid for the live price, outlined for a reference line, red for the liquidation level. */
export function Pill({ x, y, w, text, tone = "ink" }: { x: number; y: number; w: number; text: string; tone?: PillTone }) {
  return (
    <g className={`chart__pill chart__pill--${tone}`} transform={`translate(${x}, ${y - 10})`}>
      <rect width={w} height={20} rx={5} />
      <text x={w / 2} y={14} textAnchor="middle">
        {text}
      </text>
    </g>
  );
}
