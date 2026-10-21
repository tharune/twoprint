import { useEffect, useMemo, useRef, useState } from "react";
import type { IChartApi } from "lightweight-charts";
import { useApp } from "../app-context";
import { useNarrow } from "../hooks/useNarrow";
import { isLive } from "../hooks/data";
import { RANGES, RANGE_IDS, candlePoints, loadMs, rangeById, useCandles, type Range } from "../lib/candles";
import { usePref } from "../lib/prefs";
import { levelNow } from "../lib/receipt";
import { tickLabel } from "../lib/ticks";
import { fullTime, fullTimeSeconds } from "../lib/time";
import { Fill } from "./charts/Fill";
import { TimeChart, type Layer, type Level, type Point } from "./charts/TimeChart";
import { useDraft } from "./draft";
import { Segmented } from "./ui";

/** The most oracle updates a timeframe draws: more than the chart has pixels for. */
const MAX_POINTS = 1_200;
const seconds = (ms: number) => Math.floor(ms / 1000);

/** Keeps at most `n` points, evenly spread, and always the last one. */
function thin<T>(xs: T[], n: number): T[] {
  if (xs.length <= n) return xs;
  const out: T[] = [];
  for (let i = 0; i < n - 1; i++) out.push(xs[Math.floor((i * (xs.length - 1)) / (n - 1))]);
  out.push(xs[xs.length - 1]);
  return out;
}

/**
 * The Basic chart: one price line for the market over a timeframe you pick, with your own entry and liquidation price and the
 * order you are putting together drawn on it. Drag the chart to move along it, drag either axis to stretch it, double-click an axis
 * to put it back, and Reset brings the view back to the timeframe. The shortest timeframes are the oracle's own price updates, a
 * step every few seconds; the longer ones are the venue's history, because that is where the oracle's prices come from, with the
 * oracle's newest price on the end. On the local node, which has no such history, the oracle's updates draw every timeframe.
 */
export function PriceChart() {
  const { selected, market, marketLive, snap, prints, chainId, mine, ledgerReady } = useApp();
  const [picked, setRange] = usePref<Range>("twoprint.range", RANGE_IDS, "1d");
  const narrow = useNarrow();
  const local = chainId === 31337;
  // A market the contracts do not carry has no price updates of its own, so the timeframes made of them are not offered for it.
  const offered = useMemo(() => RANGES.filter((r) => marketLive || r.source === "venue"), [marketLive]);
  const range = offered.some((r) => r.id === picked) ? picked : "1d";
  const def = rangeById(range);
  const ownUpdates = local || def.source === "oracle";
  const q = useCandles(selected.source, range, !local);
  const draft = useDraft();
  const latest = marketLive ? snap?.markets[market]?.latest : undefined;
  const list = prints[market];

  const points = useMemo<Point[]>(() => {
    const now = Date.now();
    let base: Point[] = [];
    if (!ownUpdates && q.data && q.data.length > 1) base = candlePoints(q.data, now).map((p) => ({ time: seconds(p.t), value: p.v }));
    // The oracle's own updates stand in where the venue has no history. The ledger reads the oldest first, so they wait for all of it.
    else if (marketLive && ledgerReady && list.length > 1) {
      const from = loadMs(def) === 0 ? 0 : now - loadMs(def);
      base = thin(list.filter((p) => p.srcTimeMs >= from).map((p) => ({ time: seconds(p.srcTimeMs), value: Number(p.oraclePx) / 1e8 })), MAX_POINTS);
    }
    if (latest && base.length > 1) {
      const v = Number(latest.oraclePx) / 1e8;
      const last = base[base.length - 1];
      if (seconds(now) > last.time) base = [...base, { time: seconds(now), value: v }];
      else base = [...base.slice(0, -1), { ...last, value: v }];
    }
    return base;
    // The ledger appends to its arrays in place, so the length and the newest oracle price are what change.
  }, [ownUpdates, q.data, marketLive, ledgerReady, list.length, latest?.oraclePx, def.id]);

  const levels = useMemo<Level[]>(() => {
    if (!marketLive) return [];
    const out: Level[] = [];
    const held = mine.filter((p) => isLive(p) && p.fill && p.market === market);
    // With one position the lines say what they are; with several, each line carries its order number.
    for (const p of held) {
      const many = held.length > 1;
      out.push({ price: Number(p.fill!.fillPx) / 1e8, label: many ? `Entry #${p.id}` : `Your ${p.isLong ? "long" : "short"} entry`, tone: "brand" });
      out.push({ price: Number(levelNow(p)!) / 1e8, label: many ? `Liquidation #${p.id}` : "Liquidation price", tone: "short" });
    }
    if (draft.quote && draft.quote.liq > 0n) out.push({ price: Number(draft.quote.liq) / 1e8, label: "New order liquidation", tone: "short" });
    return out;
  }, [mine, market, marketLive, draft.quote]);

  const dp = selected.dp;
  // What the line is made of, so the words over it are true when the venue's history could not be read.
  const fromVenue = !ownUpdates && !!q.data && q.data.length > 1;
  const format = (v: number) => tickLabel(v, dp);
  const loading = points.length < 2 && ((!ownUpdates && q.isLoading) || !ledgerReady);
  // The oracle's updates are steps: the price holds until the next one. The venue's closes are joined by lines.
  // A minute of a quiet market can be one price: the axis keeps a span of a few hundredths of a percent so it still reads.
  const layers = useMemo<Layer[]>(() => [{ id: "price", kind: "area", tone: "brand", live: marketLive, tick: true, stepped: !fromVenue, data: points, levels, format, minSpan: 0.0004 }], [points, levels, marketLive, fromVenue, dp]);

  // The view opens on the timeframe, ending at the newest price. Zero is all of the history, which the chart fits.
  const newest = points.length ? points[points.length - 1].time : 0;
  const view = def.ms > 0 && newest ? { from: newest - def.ms / 1000, to: newest } : undefined;

  // Reset shows once the chart has been dragged or stretched, and brings the view and the price axis back.
  const [chart, setChart] = useState<IChartApi | null>(null);
  const [touched, setTouched] = useState(false);
  const [reset, setReset] = useState(0);
  useEffect(() => setTouched(false), [selected.id, range]);
  useEffect(() => {
    const el = chart?.chartElement();
    if (!el) return;
    let down: { x: number; y: number } | null = null;
    const press = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const move = (e: PointerEvent) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) setTouched(true);
    };
    const release = () => {
      down = null;
    };
    el.addEventListener("pointerdown", press);
    el.addEventListener("pointermove", move);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      el.removeEventListener("pointerdown", press);
      el.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [chart]);

  // On a phone the timeframes scroll sideways: keep the one picked in view.
  const chips = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chips.current?.querySelector('[aria-checked="true"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [range]);

  const stamp = ownUpdates ? fullTimeSeconds : fullTime;
  return (
    <section className="panel pchart" aria-label={`${selected.name} price`}>
      <header className="pchart__head">
        <p className="pchart__src">{fromVenue ? "Price on Hyperliquid." : "The oracle’s price updates."} Orders fill at the worse of the oracle price and the order-book price.</p>
        <div className="pchart__ranges" ref={chips}>
          <Segmented label="Timeframe" size="sm" value={range} onChange={setRange} options={offered.map((r) => ({ value: r.id, label: r.label, title: r.name }))} />
        </div>
      </header>
      <Fill min={narrow ? 230 : 330}>
        {(h) => (
          <div className="pchart__plot">
            <TimeChart
              mode="basic"
              interactive
              keepView
              height={h}
              layers={layers}
              range={view}
              viewKey={`${selected.id}:${range}:${reset}`}
              onChart={setChart}
              label={`${selected.name} price over the last ${def.name}`}
              loading={loading}
              empty="Prices are not available right now"
              tip={(hv) => {
                const v = hv.values.price as Point | undefined;
                return v ? (
                  <>
                    <b>{format(v.value)}</b>
                    <span>{stamp(hv.time * 1000)}</span>
                  </>
                ) : null;
              }}
            />
            {/* Over the plot, not in the header: it appears while the chart is being dragged, and must not move anything. */}
            {touched && (
              <button type="button" className="tchip pchart__reset" onClick={() => (setReset((n) => n + 1), setTouched(false))} title="Back to the timeframe">
                Reset
              </button>
            )}
          </div>
        )}
      </Fill>
    </section>
  );
}
