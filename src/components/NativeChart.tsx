import { useEffect, useMemo, useState } from "react";
import { useApp } from "../app-context";
import { isLive } from "../hooks/data";
import { useClock } from "../hooks/useClock";
import { INTERVALS, INTERVAL_IDS, mergeCandle, useCandleHistory, type Candle, type Interval } from "../lib/candles";
import { watchCandle } from "../lib/hlsocket";
import { compactUsd } from "../lib/format";
import { usePref } from "../lib/prefs";
import { levelNow } from "../lib/receipt";
import { tickLabel } from "../lib/ticks";
import { Fill } from "./charts/Fill";
import { TimeChart, type Bar, type Hover, type Layer, type Level, type Mark, type Ohlc, type Point } from "./charts/TimeChart";
import { useDraft } from "./draft";
import { Segmented } from "./ui";

const seconds = (ms: number) => Math.floor(ms / 1000);
/** How many candles the chart opens on. */
const OPEN_BARS = 110;
/** The candles a moving average is taken over. */
const AVERAGE_BARS = 20;

const toOhlc = (c: Candle): Ohlc => ({ time: seconds(c.t), open: c.o, high: c.h, low: c.l, close: c.c });

function Toggle({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: string }) {
  return (
    <button type="button" className="tchip" aria-pressed={on} onClick={() => onChange(!on)}>
      {children}
    </button>
  );
}

/**
 * The Advanced price chart: candles and volume from the venue, kept moving by its live feed, with the oracle's own prices over
 * them, your entry and liquidation price, and where your orders filled and closed. Scroll or drag to zoom and pan, and the
 * legend reads the candle under the pointer. It is built on TradingView's Lightweight Charts, in the app's colours.
 */
export function NativeChart() {
  const { selected, market, marketLive, snap, prints, mine, ledgerReady } = useApp();
  const clock = useClock();
  const draft = useDraft();
  const [interval, setInterval_] = usePref<Interval>("twoprint.interval", INTERVAL_IDS, "5m");
  const [oracle, setOracle] = usePref<"on" | "off">("twoprint.chart.oracle", ["on", "off"], "on");
  const [volume, setVolume] = usePref<"on" | "off">("twoprint.chart.volume", ["on", "off"], "on");
  const [average, setAverage] = usePref<"on" | "off">("twoprint.chart.average", ["on", "off"], "off");
  const [view, setView] = useState(0);
  const step = INTERVALS.find((i) => i.id === interval)!;
  const history = useCandleHistory(selected.source, interval);
  const [candles, setCandles] = useState<Candle[]>([]);

  useEffect(() => setCandles(history.data ?? []), [history.data]);
  // The venue's feed moves the newest candle between refreshes.
  useEffect(() => watchCandle(selected.source, interval, (c) => setCandles((prev) => mergeCandle(prev, c))), [selected.source, interval]);

  const dp = selected.dp;
  const price = (v: number) => tickLabel(v, dp);
  const latest = marketLive ? snap?.markets[market]?.latest : undefined;
  const list = prints[market];

  const levels = useMemo<Level[]>(() => {
    if (!marketLive) return [];
    const out: Level[] = [];
    const held = mine.filter((p) => isLive(p) && p.fill && p.market === market);
    for (const p of held) {
      const many = held.length > 1;
      out.push({ price: Number(p.fill!.fillPx) / 1e8, label: many ? `Entry #${p.id}` : `Your ${p.isLong ? "long" : "short"} entry`, tone: "brand" });
      out.push({ price: Number(levelNow(p)!) / 1e8, label: many ? `Liquidation #${p.id}` : "Liquidation price", tone: "short" });
    }
    if (draft.quote && draft.quote.liq > 0n) out.push({ price: Number(draft.quote.liq) / 1e8, label: "New order liquidation", tone: "short" });
    return out;
  }, [mine, market, marketLive, draft.quote]);

  const marks = useMemo<Mark[]>(() => {
    // The ledger reads the oldest events first, so until it is done the times of events are guesses.
    if (!marketLive || !ledgerReady || candles.length === 0) return [];
    const first = candles[0].t;
    const out: Mark[] = [];
    for (const p of mine) {
      if (p.market !== market) continue;
      if (p.fill) {
        const t = clock(p.fill.block);
        if (t >= first) out.push({ time: seconds(t), label: `#${p.id}`, tone: p.isLong ? "long" : "short", shape: p.isLong ? "up" : "down", above: !p.isLong, size: 0.7 });
      }
      const end = p.closed?.block ?? p.liquidated?.block;
      if (end !== undefined) {
        const t = clock(end);
        if (t >= first) out.push({ time: seconds(t), label: p.liquidated ? `Liquidated #${p.id}` : `Closed #${p.id}`, tone: p.liquidated ? "short" : "brand", shape: "dot", above: true, size: 0.6 });
      }
    }
    // Marks of one kind on one candle are one mark with a count: on a long candle a day's orders would otherwise stand in a column
    // over it and stretch the price scale to make room.
    const bucket = step.ms / 1000;
    const groups = new Map<string, Mark & { n: number }>();
    for (const m of out) {
      const at = Math.floor(m.time / bucket) * bucket;
      const key = `${at}|${m.shape}|${m.above}|${m.tone}`;
      const g = groups.get(key);
      if (g) g.n++;
      else groups.set(key, { ...m, time: at, n: 1 });
    }
    const grouped = [...groups.values()];
    // A crowd of marks with names on them is unreadable: only a few get their names, and a count always says what it counts.
    return grouped.map(({ n, ...m }) => (n > 1 ? { ...m, label: `\u00d7${n}` } : { ...m, label: grouped.length > 6 ? undefined : m.label }));
  }, [mine, market, marketLive, ledgerReady, candles, clock, step.ms]);

  const ohlc = useMemo(() => candles.map(toOhlc), [candles]);
  const vols = useMemo<Bar[]>(() => candles.map((c) => ({ time: seconds(c.t), value: c.v, tone: c.c >= c.o ? "long" : "short" })), [candles]);
  // The oracle's price at the close of each candle. It sits on the candles' own times: a line on its own, finer grid would give
  // the chart a slot for every print and squeeze the candles into thin stubs.
  const oracleLine = useMemo<Point[]>(() => {
    // Until the ledger has read every print the line would stop part-way along the chart, as if the oracle had been down.
    if (!marketLive || !ledgerReady || candles.length === 0 || list.length === 0) return [];
    const out: Point[] = [];
    const now = Date.now();
    let j = 0;
    for (const c of candles) {
      const end = Math.min(c.T, now);
      while (j + 1 < list.length && list[j + 1].srcTimeMs <= end) j++;
      const p = list[j];
      // A print from before the candle began, by more than a candle, is from before an outage: leave a gap.
      if (p.srcTimeMs <= end && p.srcTimeMs >= c.t - step.ms) out.push({ time: seconds(c.t), value: Number(p.oraclePx) / 1e8 });
    }
    return out;
    // The ledger appends to its arrays in place, so their length and the newest oracle price are what change.
  }, [marketLive, ledgerReady, candles, list.length, latest?.oraclePx, step.ms]);

  // The mean close of the last AVERAGE_BARS candles, from the candle that has that many behind it.
  const mean = useMemo<Point[]>(() => {
    if (average !== "on" || candles.length < AVERAGE_BARS) return [];
    const out: Point[] = [];
    let sum = 0;
    for (let i = 0; i < candles.length; i++) {
      sum += candles[i].c;
      if (i >= AVERAGE_BARS) sum -= candles[i - AVERAGE_BARS].c;
      if (i >= AVERAGE_BARS - 1) out.push({ time: seconds(candles[i].t), value: sum / AVERAGE_BARS });
    }
    return out;
  }, [average, candles]);

  const layers = useMemo<Layer[]>(() => {
    // One candle, which is all the live feed gives when the history could not be read, is not a chart.
    if (ohlc.length < 2) return [];
    const out: Layer[] = [{ id: "candles", kind: "candles", data: ohlc, tick: true, levels, marks, format: price }];
    if (volume === "on") out.push({ id: "volume", kind: "hist", data: vols, overlay: true, alpha: 0.32, tick: true });
    if (mean.length > 1) out.push({ id: "mean", kind: "line", data: mean, tone: "muted", width: 1, format: price, lastValue: false, tick: true });
    if (oracle === "on" && oracleLine.length > 1) out.push({ id: "oracle", kind: "line", data: oracleLine, tone: "brand", width: 2, title: "Oracle", format: price, tick: true });
    return out;
  }, [ohlc, levels, marks, vols, mean, oracleLine, volume, oracle, dp]);

  const lastT = ohlc.length ? ohlc[ohlc.length - 1].time : 0;
  const range = lastT ? { from: lastT - OPEN_BARS * (step.ms / 1000), to: lastT + 8 * (step.ms / 1000) } : undefined;

  // On a phone the legend keeps the close and the change: open, high, low and volume would wrap it onto three lines over the candles.
  const legend = (h: Hover | null) => {
    const shown = h?.values.candles as Ohlc | undefined;
    const c = shown ?? ohlc[ohlc.length - 1];
    if (!c || ohlc.length < 2) return null;
    const vol = (h?.values.volume as Bar | undefined)?.value ?? candles[candles.length - 1]?.v;
    const move = c.close - c.open;
    const cls = move >= 0 ? "is-up" : "is-down";
    return (
      <>
        <span>
          <b>{selected.symbol}</b> {step.label}
        </span>
        <span className="hide-sm">O <b>{price(c.open)}</b></span>
        <span className="hide-sm">H <b>{price(c.high)}</b></span>
        <span className="hide-sm">L <b>{price(c.low)}</b></span>
        <span>C <b>{price(c.close)}</b></span>
        <span className={cls}>
          {move >= 0 ? "+" : "−"}
          {price(Math.abs(move))} ({move >= 0 ? "+" : "−"}
          {c.open ? Math.abs((move / c.open) * 100).toFixed(2) : "0.00"}%)
        </span>
        {mean.length > 1 && (
          <span className="hide-sm">
            MA {AVERAGE_BARS} <b>{price(((h?.values.mean as Point | undefined) ?? mean[mean.length - 1]).value)}</b>
          </span>
        )}
        {vol !== undefined && volume === "on" && <span className="hide-sm">Vol <b>{vol >= 1000 ? compactUsd(vol).replace("$", "") : vol.toFixed(2)}</b></span>}
      </>
    );
  };

  return (
    <div className="nchart">
      <div className="nchart__bar">
        <Segmented label="Candle size" size="sm" value={interval} onChange={(v) => setInterval_(v)} options={INTERVALS.map((i) => ({ value: i.id, label: i.label }))} />
        <div className="nchart__tools">
          {marketLive && <Toggle on={oracle === "on"} onChange={(v) => setOracle(v ? "on" : "off")}>Oracle</Toggle>}
          <Toggle on={volume === "on"} onChange={(v) => setVolume(v ? "on" : "off")}>Volume</Toggle>
          <Toggle on={average === "on"} onChange={(v) => setAverage(v ? "on" : "off")}>{`MA ${AVERAGE_BARS}`}</Toggle>
          <button type="button" className="tchip" onClick={() => setView((n) => n + 1)} title="Back to the latest candles">
            Latest
          </button>
        </div>
      </div>
      <Fill min={420}>
        {(h) => (
          <TimeChart
            mode="advanced"
            edges="free"
            keepView
            height={h}
            layers={layers}
            range={range}
            viewKey={`${selected.id}:${interval}:${view}`}
            label={`${selected.name} candles, ${step.label}`}
            loading={history.isLoading && candles.length < 2}
            empty={history.isError ? "Prices are not available right now" : "No candles yet"}
            legend={legend}
          />
        )}
      </Fill>
    </div>
  );
}
