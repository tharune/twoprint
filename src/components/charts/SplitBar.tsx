import type { ReactNode } from "react";

export interface Part {
  label: string;
  value: number;
  tone?: "long" | "short" | "brand" | "muted" | "slate";
}

/**
 * A whole cut into its parts along one bar, with the parts named underneath: how open interest splits between long and short,
 * or where a fee goes. A part of nothing is left off the bar and still named.
 */
export function SplitBar({ parts, format, label, empty }: { parts: Part[]; format: (v: number) => string; label: string; empty?: ReactNode }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  return (
    <figure className="split" aria-label={label}>
      {total > 0 ? (
        <div className="split__bar" role="presentation">
          {parts
            .filter((p) => p.value > 0)
            .map((p) => (
              <span key={p.label} className={`split__part split__part--${p.tone ?? "brand"}`} style={{ flex: `${p.value / total} 1 0` }} />
            ))}
        </div>
      ) : (
        <div className="split__bar split__bar--empty" role="presentation" />
      )}
      <figcaption className="split__legend">
        {total > 0 ? (
          parts.map((p) => (
            <span key={p.label} className="split__key">
              <i className={`split__swatch split__part--${p.tone ?? "brand"}`} aria-hidden="true" />
              <span>{p.label}</span>
              <b>{format(p.value)}</b>
              <span className="muted">{((p.value / total) * 100).toFixed(0)}%</span>
            </span>
          ))
        ) : (
          <span className="muted">{empty ?? "Nothing yet"}</span>
        )}
      </figcaption>
    </figure>
  );
}
