import type { ReactNode } from "react";

export interface Rank {
  label: string;
  value: number;
  /** A line under the label. */
  sub?: ReactNode;
}

/**
 * A few things measured against each other, one bar each, longest first by the order given. The bar is the size of the value
 * against the largest; green above zero, red below it, and a thing that has made nothing yet shows an empty track, not a gap.
 */
export function RankBars({ items, format, label }: { items: Rank[]; format: (v: number) => string; label: string }) {
  const top = Math.max(...items.map((i) => Math.abs(i.value)), 0);
  return (
    <ul className="rank" aria-label={label}>
      {items.map((it) => {
        const share = top > 0 ? (Math.abs(it.value) / top) * 100 : 0;
        const tone = it.value > 0 ? "long" : it.value < 0 ? "short" : "none";
        return (
          <li key={it.label} className="rank__row">
            <span className="rank__name">
              <b>{it.label}</b>
              {it.sub && <small>{it.sub}</small>}
            </span>
            <span className="rank__track" aria-hidden="true">
              <span className="rank__fill" data-tone={tone} style={{ width: `${share}%` }} />
            </span>
            <span className={`rank__value${tone === "long" ? " text-long" : tone === "short" ? " text-short" : ""}`}>{format(it.value)}</span>
          </li>
        );
      })}
    </ul>
  );
}
