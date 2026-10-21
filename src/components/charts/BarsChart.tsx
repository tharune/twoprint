import { useMemo, type ReactNode } from "react";
import { sequence } from "../../lib/grid";
import { trimmed } from "../../lib/format";
import { fullTime } from "../../lib/time";
import type { ChartMode } from "./engine";
import { TimeChart, type Bar, type Hover, type Layer, type Tone } from "./TimeChart";

export interface BarItem {
  /** What the bar is, printed on the axis and in the card: an order number. */
  label: string;
  value: number;
  /** A colour for this bar. Without one, a bar is green above zero and red below it, or the chart's own tone. */
  tone?: Tone;
  /** A line under the value in the card. */
  note?: ReactNode;
}

interface Common {
  mode: ChartMode;
  height?: number | "fill";
  label: string;
  empty: ReactNode;
  loading?: boolean;
  /** How a value reads on the axis and in the card. */
  format: (v: number) => string;
  /** How a tick on the axis reads. Without it, the card's reading with the zeros at the end of its decimals dropped. */
  axisFormat?: (v: number) => string;
}

const axisFormat = (c: Common) => c.axisFormat ?? ((v: number) => trimmed(c.format(v)));

/** The widest a bar is allowed to be, so a few bars are bars and not walls. */
const FAT = 44;

/**
 * One bar for each thing in a sequence, such as an order, with its name under it. The sequence is the axis, so bars are even
 * and a gap in time makes no gap in the picture. Green above zero and red below it unless a bar says otherwise.
 */
export function SequenceBars({ items, tone, ...c }: Common & { items: BarItem[]; tone?: "signed" | Tone }) {
  const seq = useMemo(() => sequence(items.map((i) => i.label)), [items]);
  const layers = useMemo<Layer[]>(() => {
    const data: Bar[] = items.map((it, i) => ({ time: seq.times[i], value: it.value, tone: it.tone ?? (tone === "signed" || !tone ? (it.value >= 0 ? "long" : "short") : tone) }));
    return [{ id: "bars", kind: "hist", data, alpha: 0.9, format: axisFormat(c), lastValue: false }];
  }, [items, seq, tone]);
  const tip = (h: Hover) => {
    const it = items[seq.index(h.time)];
    return it ? (
      <>
        <b>{c.format(it.value)}</b>
        <span>{it.label}</span>
        {it.note && <i>{it.note}</i>}
      </>
    ) : null;
  };
  return <TimeChart mode={c.mode} height={c.height} layers={layers} axis={seq.name} spacing={FAT} viewKey={items.length} label={c.label} empty={c.empty} loading={c.loading} tip={tip} />;
}

/** Bars over time: what happened in each stretch of a regular grid, with the count in the card. */
export function TimeBars({ buckets, range, tone, unit = "order", ...c }: Common & { buckets: { t: number; v: number; n: number }[]; range?: { from: number; to: number }; tone?: "signed" | Tone; unit?: string }) {
  const layers = useMemo<Layer[]>(() => {
    const data: Bar[] = buckets.map((b) => ({ time: Math.floor(b.t / 1000), value: b.v, tone: tone === "signed" ? (b.v >= 0 ? "long" : "short") : (tone ?? "brand") }));
    return [{ id: "bars", kind: "hist", data, alpha: 0.9, format: axisFormat(c), lastValue: false }];
  }, [buckets, tone]);
  const tip = (h: Hover) => {
    const b = buckets.find((x) => Math.floor(x.t / 1000) === h.time);
    return b ? (
      <>
        <b>{c.format(b.v)}</b>
        <span>{fullTime(b.t)}</span>
        {b.n > 0 && (
          <i>
            {b.n} {unit}
            {b.n === 1 ? "" : "s"}
          </i>
        )}
      </>
    ) : null;
  };
  return <TimeChart mode={c.mode} height={c.height} layers={layers} range={range} viewKey={buckets.length} label={c.label} empty={c.empty} loading={c.loading} tip={tip} />;
}
