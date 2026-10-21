import { useMemo, useState, type ReactNode } from "react";
import { useNow } from "../../hooks/data";
import { HOUR, bucketEvents, bucketSize, sampleSteps, windowFor } from "../../lib/grid";
import { money } from "../../lib/format";
import { fullTime } from "../../lib/time";
import type { Step } from "../../lib/series";
import { Segmented } from "../ui";
import type { ChartMode } from "./engine";
import { TimeChart, type Bar, type Hover, type Layer, type Mark, type Point } from "./TimeChart";

type Span = "all" | "1d" | "6h" | "1h";
const SPANS: { id: Span; label: string; ms: number }[] = [
  { id: "all", label: "All", ms: 0 },
  { id: "1d", label: "1D", ms: 24 * HOUR },
  { id: "6h", label: "6H", ms: 6 * HOUR },
  { id: "1h", label: "1H", ms: HOUR },
];

interface Props {
  mode: ChartMode;
  /** The running total after each event, oldest first, the first being the start at zero. */
  steps: Step[];
  height?: number | "fill";
  label: string;
  empty: ReactNode;
  loading?: boolean;
  /** Said under the total in the card: what a step was. */
  unit?: string;
}

const seconds = (ms: number) => Math.floor(ms / 1000);

/**
 * A running total over time, green above zero and red below it. Between events it is flat, as the money is; each event is a
 * step, and Advanced marks every one, draws what each added in a pane of its own, and lets you zoom and pan. The window opens a
 * little before the first event and ends now, so one event an hour ago is a clear step with room around it, not a line on the edge.
 */
export function PnlChart({ mode, steps, height = 260, label, empty, loading, unit = "tUSDC" }: Props) {
  const now = useNow(30_000);
  const [span, setSpan] = useState<Span>("all");
  const advanced = mode === "advanced";

  const built = useMemo(() => {
    if (steps.length === 0) return null;
    const win = windowFor(steps[0].t, now);
    const size = bucketSize(win.to - win.from, advanced ? 90 : 64);
    const total = sampleSteps(steps, win.from, win.to, size);
    const added = steps.slice(1).map((s, i) => ({ t: s.t, v: s.v - steps[i].v }));
    const bars = bucketEvents(added, total[0].t, win.to, size);
    return { win, size, total, bars };
  }, [steps, now, advanced]);

  const fmt = (v: number) => `${money(v, 2, true)} ${unit}`;
  // A round tick is a plain number; the tag on the last value keeps its cents.
  const axisFmt = (v: number) => money(v, Number.isInteger(v) ? 0 : 2, true);

  const layers = useMemo<Layer[]>(() => {
    if (!built) return [];
    // Before the first change the total is nothing, and says so in a plain grey line, not in green or red.
    const firstChange = steps[1]?.t ?? Infinity;
    const lastFlat = built.total.reduce((k, g, i) => (g.t < firstChange ? i : k), 0);
    const flat: Point[] = built.total.slice(0, lastFlat + 1).map((g) => ({ time: seconds(g.t), value: 0 }));
    const points: Point[] = built.total.slice(lastFlat).map((g) => ({ time: seconds(g.t), value: g.v }));
    const marks: Mark[] = advanced
      ? steps.slice(1).map((s, i) => {
          const up = s.v >= steps[i].v;
          // A step sits on the grid moment that carries it.
          const at = Math.ceil(s.t / built.size) * built.size;
          const few = steps.length <= 9;
          return { time: seconds(at), tone: up ? "long" : "short", shape: few ? (up ? "up" : "down") : "dot", above: !up, size: few ? 0.7 : 0.5, label: few ? s.note?.replace(/^(Closed|Liquidated) order /, "").replace(/ settled$/, "") : undefined } as Mark;
        })
      : [];
    const out: Layer[] = [];
    if (steps.length > 1) out.push({ id: "flat", kind: "line", tone: "muted", width: 2, stepped: true, data: flat, lastValue: false, format: axisFmt });
    out.push({ id: "pnl", kind: "baseline", data: steps.length > 1 ? points : built.total.map((g) => ({ time: seconds(g.t), value: g.v })), stepped: true, live: true, tick: true, marks, format: axisFmt });
    if (advanced) {
      const bars: Bar[] = built.bars.map((b) => ({ time: seconds(b.t), value: b.v, tone: b.v >= 0 ? "long" : "short" }));
      out.push({ id: "added", kind: "hist", data: bars, pane: 1, alpha: 0.85, lastValue: false, format: axisFmt });
    }
    return out;
  }, [built, steps, advanced]);

  const range = useMemo(() => {
    if (!built) return undefined;
    const to = seconds(built.win.to);
    const ms = SPANS.find((s) => s.id === span)!.ms;
    return { from: ms && advanced ? Math.max(seconds(built.win.from), to - seconds(ms)) : seconds(built.win.from), to };
  }, [built, span, advanced]);

  const tip = (h: Hover) => {
    const p = (h.values.pnl ?? h.values.flat) as Point | undefined;
    if (!p || !built) return null;
    // What happened in the stretch under the pointer.
    const t0 = h.time * 1000;
    const hit = steps.slice(1).filter((s) => s.t > t0 - built.size && s.t <= t0 + built.size / 2).map((s) => s.note).filter(Boolean);
    return (
      <>
        <b>{fmt(p.value)}</b>
        <span>{fullTime(t0)}</span>
        {hit.length > 0 && <i>{hit.slice(0, 2).join(", ")}</i>}
      </>
    );
  };

  return (
    <div className="pnlchart">
      {advanced && built && (
        <div className="pnlchart__bar">
          <Segmented label="Span" size="sm" value={span} onChange={setSpan} options={SPANS.map((s) => ({ value: s.id, label: s.label }))} />
        </div>
      )}
      <TimeChart
        mode={mode}
        layers={layers}
        height={height}
        range={range}
        viewKey={`${span}:${steps.length}`}
        paneWeights={[3, 1]}
        label={label}
        empty={empty}
        loading={loading}
        tip={tip}
      />
    </div>
  );
}
