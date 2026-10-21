import type { ReactNode } from "react";
import type { LiquidationDistanceResult } from "../lib/alerts";
import { px } from "../lib/format";
import { RiskBadge, riskTone } from "./risk";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Kind = "oracle" | "book" | "fill";
interface Cluster {
  value: bigint;
  names: string[];
  kinds: Kind[];
}

/**
 * How the fill price was set, drawn: the oracle price and the basis-adjusted book on one line, the worse of the two
 * for you setting the price. Prices that coincide share one marker.
 */
export function FillPrice({ oracle, adjusted, fill, isLong, market }: { oracle: bigint; adjusted: bigint; fill: bigint; isLong: boolean; market: number }) {
  const entries: { name: string; value: bigint; kind: Kind }[] = [
    { name: "Oracle", value: oracle, kind: "oracle" },
    { name: "Adjusted book", value: adjusted, kind: "book" },
    { name: "Fill", value: fill, kind: "fill" },
  ];
  const clusters: Cluster[] = [];
  for (const e of entries) {
    const c = clusters.find((x) => x.value === e.value);
    if (c) {
      c.names.push(e.name);
      c.kinds.push(e.kind);
    } else clusters.push({ value: e.value, names: [e.name], kinds: [e.kind] });
  }
  clusters.sort((a, b) => (a.value < b.value ? -1 : a.value > b.value ? 1 : 0));

  const nums = clusters.map((c) => Number(c.value));
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  const pad = Math.max((hi - lo) * 0.6, Number(oracle) * 2e-5);
  const dLo = lo - pad;
  const dHi = hi + pad;
  const at = (v: bigint | number) => ((Number(v) - dLo) / (dHi - dLo)) * 100;

  const cost = oracle === fill ? null : { from: Math.min(at(oracle), at(fill)), to: Math.max(at(oracle), at(fill)) };
  const verb = isLong ? "higher" : "lower";

  return (
    <figure className="fillviz" aria-label={`The fill price is the ${verb} of the oracle price and the basis-adjusted book`}>
      <div className="fillviz__plot">
        <div className="fillviz__track" />
        {cost && <div className="fillviz__cost" style={{ left: `${cost.from}%`, width: `${cost.to - cost.from}%` }} />}
        {clusters.map((c, i) => {
          const x = at(c.value);
          const solid = c.kinds.includes("fill");
          const side = i % 2 === 0 ? "above" : "below";
          const name = c.names.map((n, k) => (k ? n.toLowerCase() : n)).join(" and ");
          return (
            <div key={String(c.value)}>
              <span className="fillviz__dot" data-solid={solid || undefined} style={{ left: `${x}%` }} />
              <span className="fillviz__label" data-side={side} data-solid={solid || undefined} style={{ left: `${clamp(x, 17, 83)}%` }}>
                <span>{name}</span>
                <b>{px(c.value, market, 1)}</b>
              </span>
            </div>
          );
        })}
      </div>
      <figcaption>
        You {isLong ? "pay" : "sell at"} the {verb} of the two.
      </figcaption>
    </figure>
  );
}

/**
 * Where the price is between the liquidation level and the entry: the track runs from the level, at the left, to the
 * entry, and past it while the position is in profit.
 */
export function RiskMeter({ liq, entry, now, risk, market }: { liq: bigint; entry: bigint; now: bigint; risk: LiquidationDistanceResult; market: number }) {
  const ratio = Number(risk.distRatioBps) / 10000;
  const span = Math.max(1.2, ratio + 0.15);
  const pos = (t: number) => clamp((t / span) * 100, 0, 100);
  const tone = riskTone(risk.alertTier);
  return (
    <div className="meter">
      <div className="meter__ends">
        <span>
          Liquidation price <b className="text-short">{px(liq, market)}</b>
        </span>
        <span>
          Entry <b>{px(entry, market)}</b>
        </span>
      </div>
      <div
        className="meter__track"
        role="meter"
        aria-label="Distance to liquidation left"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamp(risk.bufferRemainingPct, 0, 100))}
        aria-valuetext={`${Math.min(100, risk.bufferRemainingPct).toFixed(1)}% of the distance to liquidation is left`}
      >
        <span className="meter__fill" data-tone={tone} style={{ width: `${pos(ratio)}%` }} />
        <span className="meter__entry" style={{ left: `${pos(1)}%` }} />
        <span className="meter__now" data-tone={tone} style={{ left: `${pos(ratio)}%` }} />
      </div>
      <p className="meter__foot">
        <span>
          Now {px(now, market)}, {px(risk.distPx, market)} from your liquidation price
        </span>
        <span className="inline-gap">
          {Math.min(100, risk.bufferRemainingPct).toFixed(1)}% of the distance is left <RiskBadge tier={risk.alertTier} />
        </span>
      </p>
    </div>
  );
}

export interface Result {
  label: string;
  value: ReactNode;
  tone?: "long" | "short";
  note?: ReactNode;
}

/** The outcome of an order in a few large numbers. */
export function Results({ items }: { items: Result[] }) {
  return (
    <dl className="results">
      {items.map((r) => (
        <div key={r.label}>
          <dt>{r.label}</dt>
          <dd className={r.tone ? `text-${r.tone}` : undefined}>{r.value}</dd>
          {r.note && <span className="results__note">{r.note}</span>}
        </div>
      ))}
    </dl>
  );
}
