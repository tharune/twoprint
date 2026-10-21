import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  AreaSeries,
  BaselineSeries,
  CandlestickSeries,
  HistogramSeries,
  LastPriceAnimationMode,
  LineSeries,
  LineStyle,
  LineType,
  createChart,
  createSeriesMarkers,
  type AutoscaleInfo,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type MouseEventParams,
  type SeriesMarker,
  type SeriesType,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { useThemeName } from "../../lib/theme";
import { baseOptions, type ChartMode } from "./engine";
import { readPalette, rgba, type Palette } from "./palette";

export type Tone = "brand" | "long" | "short" | "muted";

/** How many bars of room a free-edged chart keeps to the right of its newest one. */
const FREE_EDGE_BARS = 8;

/** The live point beats like a pulse, unless the visitor has asked their device for less motion. */
const pulse = (live: boolean | undefined) =>
  live && !(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) ? LastPriceAnimationMode.Continuous : LastPriceAnimationMode.Disabled;

/** A value at a moment. Times are in seconds, strictly increasing. */
export interface Point {
  time: number;
  value: number;
}
export interface Bar extends Point {
  /** A colour for this bar, over its layer's. */
  tone?: Tone;
}
export interface Ohlc {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}
/** A price drawn across the chart, such as an entry or a liquidation price. */
export interface Level {
  price: number;
  label: string;
  tone?: Tone;
  dashed?: boolean;
}
/** Something that happened at a moment, marked on its layer's line. */
export interface Mark {
  time: number;
  label?: string;
  tone?: Tone;
  shape?: "dot" | "up" | "down";
  above?: boolean;
  /** 1 is the library's size; smaller keeps a crowd of marks readable. */
  size?: number;
}

interface Common {
  id: string;
  /** Layers share the first pane unless they say otherwise. */
  pane?: number;
  levels?: Level[];
  marks?: Mark[];
  /** How a value of this layer reads on its axis, in the card and in the legend. */
  format?: (v: number) => string;
  /** Tag the last value on the price axis. On by default. */
  lastValue?: boolean;
  /** A name tagged beside the last value on the price axis. */
  title?: string;
  /** A live series: when only its newest point changes (or one is added) the chart updates in place instead of setting it again. */
  tick?: boolean;
  /** The least the price axis may span, as a share of the price. A short stretch of a quiet market would otherwise fill the axis with one repeated number. */
  minSpan?: number;
}

export type Layer =
  | (Common & { kind: "area"; data: Point[]; tone?: Tone; stepped?: boolean; live?: boolean })
  | (Common & { kind: "baseline"; data: Point[]; base?: number; stepped?: boolean; live?: boolean })
  | (Common & { kind: "line"; data: Point[]; tone?: Tone; width?: 1 | 2 | 3; dashed?: boolean; stepped?: boolean })
  | (Common & { kind: "hist"; data: Bar[]; tone?: Tone; overlay?: boolean; alpha?: number })
  | (Common & { kind: "candles"; data: Ohlc[] });

/** What is under the pointer: the moment and each layer's reading there. */
export interface Hover {
  time: number;
  x: number;
  y: number;
  values: Record<string, Point | Bar | Ohlc | undefined>;
}

interface Props {
  mode: ChartMode;
  layers: Layer[];
  /** A number of pixels, or "fill" to take the height of the box the chart sits in. */
  height?: number | "fill";
  /** What the chart is, for a screen reader. */
  label: string;
  /** Shown over the chart when no layer has anything to draw. */
  empty?: ReactNode;
  /** A shimmer in place of the chart while its data is on the way. */
  loading?: boolean;
  /** The moments to show, in seconds. Without it the view fits the data. */
  range?: { from: number; to: number };
  /** Change it to bring the view back to `range` (or to the data), for example when the span or the market changes. */
  viewKey?: string | number;
  /** The card that follows the pointer. */
  tip?: (h: Hover) => ReactNode;
  /** The line of readings in the corner: the pointer's moment, or null when the pointer is away. */
  legend?: (h: Hover | null) => ReactNode;
  /** Receives the chart once it exists (null when it goes), for toolbars that zoom it. */
  onChart?: (chart: IChartApi | null) => void;
  /** Names the axis and the crosshair print in place of a clock time, for bars that stand for things in a sequence. */
  axis?: (time: number) => string;
  /** The relative heights of the panes, top first, when layers use more than one. */
  paneWeights?: number[];
  /** Pixels between bars. Few bars would otherwise be hairlines; this fattens them. */
  spacing?: number;
  /** "free" lets the view move past the newest point, for a live chart; the default stops at the data. */
  edges?: "fixed" | "free";
  /** Drag to pan and drag an axis to stretch it, on a chart that is not Advanced. Advanced is always draggable. */
  interactive?: boolean;
  /** Keep the view where the reader put it when `range` moves with new data. It then changes only with `viewKey`. */
  keepView?: boolean;
}

const colour = (p: Palette, tone: Tone | undefined, fallback: Tone = "brand") => {
  const t = tone ?? fallback;
  return t === "long" ? p.long : t === "short" ? p.short : t === "muted" ? p.faint : p.brand;
};

const times = (layer: Layer) => (layer.data as { time: number }[]).map((d) => d.time);

/** Series data as the library wants it: ascending, one value per moment (the last one wins). */
function clean<T extends { time: number }>(data: readonly T[]): T[] {
  const out: T[] = [];
  for (const d of [...data].sort((a, b) => a.time - b.time)) {
    if (out.length && out[out.length - 1].time === d.time) out[out.length - 1] = d;
    else out.push(d);
  }
  return out;
}

function seriesOptions(layer: Layer, p: Palette, mode: ChartMode) {
  const showLast = layer.lastValue !== false;
  const format = layer.format
    ? { priceFormat: { type: "custom" as const, formatter: layer.format, minMove: 0.0001 } }
    : {};
  const common = {
    ...format,
    lastValueVisible: showLast,
    priceLineVisible: false,
    crosshairMarkerRadius: 4,
    title: layer.title ?? "",
    ...(layer.minSpan
      ? {
          autoscaleInfoProvider: (original: () => AutoscaleInfo | null): AutoscaleInfo | null => {
            const info = original();
            if (!info?.priceRange) return info;
            const { minValue, maxValue } = info.priceRange;
            const mid = (minValue + maxValue) / 2;
            const least = Math.abs(mid) * layer.minSpan!;
            return maxValue - minValue >= least ? info : { ...info, priceRange: { minValue: mid - least / 2, maxValue: mid + least / 2 } };
          },
        }
      : {}),
  };
  switch (layer.kind) {
    case "area": {
      const c = colour(p, layer.tone);
      return {
        ...common,
        lineColor: c,
        topColor: rgba(c, p.dark ? 0.32 : 0.26),
        bottomColor: rgba(c, 0),
        lineWidth: 2 as const,
        lineType: layer.stepped ? LineType.WithSteps : LineType.Simple,
        lastPriceAnimation: pulse(layer.live),
        priceLineVisible: showLast && !!layer.live,
        priceLineColor: rgba(c, 0.5),
        priceLineStyle: LineStyle.Dotted,
      };
    }
    case "baseline":
      return {
        ...common,
        baseValue: { type: "price" as const, price: layer.base ?? 0 },
        topLineColor: p.long,
        topFillColor1: rgba(p.long, p.dark ? 0.32 : 0.26),
        topFillColor2: rgba(p.long, 0.02),
        bottomLineColor: p.short,
        bottomFillColor1: rgba(p.short, 0.02),
        bottomFillColor2: rgba(p.short, p.dark ? 0.32 : 0.26),
        lineWidth: 2 as const,
        lineType: layer.stepped ? LineType.WithSteps : LineType.Simple,
        lastPriceAnimation: pulse(layer.live),
      };
    case "line":
      return {
        ...common,
        color: colour(p, layer.tone),
        lineWidth: layer.width ?? 2,
        lineStyle: layer.dashed ? LineStyle.Dashed : LineStyle.Solid,
        lineType: layer.stepped ? LineType.WithSteps : LineType.Simple,
      };
    case "hist":
      return {
        ...common,
        color: rgba(colour(p, layer.tone, "muted"), layer.alpha ?? 1),
        base: 0,
        ...(layer.overlay ? { priceScaleId: "", lastValueVisible: false } : {}),
      };
    case "candles":
      return {
        ...common,
        upColor: p.long,
        downColor: p.short,
        wickUpColor: p.long,
        wickDownColor: p.short,
        borderVisible: false,
        priceLineVisible: mode === "advanced",
        priceLineStyle: LineStyle.Dotted,
      };
  }
}

const definition = (layer: Layer) =>
  layer.kind === "area" ? AreaSeries : layer.kind === "baseline" ? BaselineSeries : layer.kind === "line" ? LineSeries : layer.kind === "hist" ? HistogramSeries : CandlestickSeries;

function toLibrary(layer: Layer, p: Palette) {
  if (layer.kind === "hist") {
    const fade = layer.alpha ?? 1;
    return clean(layer.data).map((d) => ({ time: d.time as UTCTimestamp, value: d.value, ...(d.tone ? { color: rgba(colour(p, d.tone), fade) } : {}) }));
  }
  return clean(layer.data as { time: number }[]).map((d) => ({ ...d, time: d.time as UTCTimestamp }));
}

/**
 * A time chart on TradingView's Lightweight Charts, in the app's colours. It takes layers (area, baseline, line, bars or candles),
 * draws them, and gives back what is under the pointer so each page can say what that moment was. Its data is whatever it is
 * handed: it never draws a point that did not happen, and a market that has not moved is a flat line, not a gap.
 */
export function TimeChart({ mode, layers, height = 260, label, empty, loading, range, viewKey, tip, legend, onChart, axis, paneWeights, spacing, edges = "fixed", interactive, keepView }: Props) {
  const draggable = interactive ?? mode === "advanced";
  const theme = useThemeName();
  // The colours are read from the page's tokens, so they are read again when the theme changes.
  const palette = useMemo(() => readPalette(), [theme]);
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const built = useRef(new Map<string, { api: ISeriesApi<SeriesType>; lines: IPriceLine[]; marks: ISeriesMarkersPluginApi<Time> | null; sig: { n: number; first?: number; last?: number; before?: number } | null }>());
  const [hover, setHover] = useState<Hover | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const handler = useRef<(p: MouseEventParams<Time>) => void>(() => {});

  // The chart itself, made once per mode and removed with the component.
  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const c = createChart(el, baseOptions(readPalette(), mode, edges, draggable));
    chart.current = c;
    c.subscribeCrosshairMove((p) => handler.current(p));
    onChart?.(c);
    return () => {
      built.current.clear();
      chart.current = null;
      onChart?.(null);
      c.remove();
    };
  }, [mode, edges, draggable]);

  useEffect(() => {
    const base = baseOptions(palette, mode, edges, draggable);
    // Things in a sequence read left to right and end at the edge, with no room left for bars that are not coming.
    const named = axis ? { timeScale: { ...base.timeScale, rightOffset: 0, tickMarkFormatter: (t: Time) => axis(t as number) }, localization: { timeFormatter: (t: Time) => axis(t as number) } } : {};
    chart.current?.applyOptions({ ...base, ...named });
  }, [palette, mode, axis, edges, draggable]);

  // Which layers there are and how each looks. Anything else about a layer is data and changes in place.
  const shape = layers.map((l) => `${l.id}|${l.kind}|${l.pane ?? 0}|${"tone" in l ? l.tone : ""}|${"stepped" in l ? l.stepped : ""}|${"live" in l ? l.live : ""}|${"overlay" in l ? l.overlay : ""}`).join(";");
  useLayoutEffect(() => {
    const c = chart.current;
    if (!c) return;
    const made = built.current;
    layers.forEach((layer) => {
      const api = c.addSeries(definition(layer) as never, seriesOptions(layer, palette, mode) as never, layer.pane ?? 0) as ISeriesApi<SeriesType>;
      if (layer.kind === "hist" && layer.overlay) api.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      made.set(layer.id, { api, lines: [], marks: null, sig: null });
    });
    if (paneWeights) c.panes().forEach((pane, i) => pane.setStretchFactor(paneWeights[i] ?? 1));
    return () => {
      if (chart.current !== c) return;
      for (const s of made.values()) {
        try {
          c.removeSeries(s.api);
        } catch {
          /* the chart is already gone */
        }
      }
      made.clear();
    };
  }, [shape, mode, palette]);

  // Data, price lines and marks. A newest point alone is an update; anything else sets the series again.
  useLayoutEffect(() => {
    const c = chart.current;
    if (!c) return;
    for (const layer of layers) {
      const s = built.current.get(layer.id);
      if (!s) continue;
      const data = toLibrary(layer, palette);
      const sig = { n: data.length, first: data[0]?.time, last: data[data.length - 1]?.time, before: data[data.length - 2]?.time };
      const was = s.sig;
      // Only the newest point moved or one was added: the same start, and the same newest-but-one as before.
      const inPlace =
        !!layer.tick && !!was && was.n > 0 && was.first === sig.first && ((sig.n === was.n && sig.last === was.last) || (sig.n === was.n + 1 && sig.before === was.last));
      if (inPlace) (s.api as ISeriesApi<"Line">).update(data[data.length - 1] as never);
      else (s.api as ISeriesApi<"Line">).setData(data as never);
      s.sig = sig;

      for (const l of s.lines) s.api.removePriceLine(l);
      s.lines = (layer.levels ?? []).map((lv) =>
        s.api.createPriceLine({
          price: lv.price,
          color: colour(palette, lv.tone, "muted"),
          lineWidth: 1,
          lineStyle: lv.dashed === false ? LineStyle.Solid : LineStyle.Dashed,
          axisLabelVisible: true,
          title: lv.label,
        }),
      );

      const marks: SeriesMarker<Time>[] = (layer.marks ?? [])
        .map((m) => ({
          time: m.time as UTCTimestamp,
          position: m.above ? ("aboveBar" as const) : ("belowBar" as const),
          shape: m.shape === "up" ? ("arrowUp" as const) : m.shape === "down" ? ("arrowDown" as const) : ("circle" as const),
          color: colour(palette, m.tone),
          text: m.label,
          size: m.size ?? 1,
        }))
        .sort((a, b) => (a.time as number) - (b.time as number));
      if (!s.marks) s.marks = createSeriesMarkers(s.api, marks);
      else s.marks.setMarkers(marks);
    }
  }, [layers, shape, mode, palette]);

  // The view: the range asked for, or all of the data.
  const rangeKey = range ? `${range.from}:${range.to}` : "";
  useLayoutEffect(() => {
    const c = chart.current;
    if (!c) return;
    const hasData = layers.some((l) => l.data.length > 0);
    if (!hasData) return;
    // Stretching the price axis by hand turns its automatic fit off. Bringing the view back turns it on again.
    c.priceScale("right").applyOptions({ autoScale: true });
    try {
      if (range) {
        c.timeScale().setVisibleRange({ from: range.from as UTCTimestamp, to: range.to as UTCTimestamp });
        // The axis counts bars, not time, so a range ending after the newest bar stops at it. A free edge leaves room beyond it, as a
        // trading chart does, so the newest candle is not pressed against the price axis and its time label is not cut off. The room
        // is set outright: adding it to the range as it stands would add it again every time the view is brought back.
        if (edges === "free") c.timeScale().scrollToPosition(FREE_EDGE_BARS, false);
      } else c.timeScale().fitContent();
    } catch {
      c.timeScale().fitContent();
    }
    // A few bars are held to a sensible width and start at the left edge, in reading order.
    if (spacing) {
      const n = Math.max(...layers.map((l) => l.data.length));
      const room = Math.max(1, Math.floor(c.timeScale().width() / spacing));
      if (n < room) c.timeScale().setVisibleLogicalRange({ from: -0.5, to: room - 0.5 });
    }
    // With `keepView` the range is read when the view is brought back, not each time it moves with new data.
  }, [viewKey, keepView ? "" : rangeKey, shape, layers.some((l) => l.data.length > 0)]);

  // The pointer, and the arrow keys for those without one.
  handler.current = (p) => {
    if (!p.time || !p.point || p.point.x < 0 || p.point.y < 0) {
      setHover(null);
      return;
    }
    const values: Hover["values"] = {};
    for (const [id, s] of built.current) values[id] = p.seriesData.get(s.api) as Hover["values"][string];
    setHover({ time: p.time as number, x: p.point.x, y: p.point.y, values });
  };
  const first = layers.find((l) => l.data.length > 0);
  const onKey = (e: KeyboardEvent) => {
    const c = chart.current;
    if (!c || !first) return;
    const ts = times(first);
    if (e.key === "Escape") {
      setCursor(null);
      c.clearCrosshairPosition();
      setHover(null);
      return;
    }
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const at = Math.min(ts.length - 1, Math.max(0, (cursor ?? ts.length - 1) + (e.key === "ArrowRight" ? 1 : -1)));
    setCursor(at);
    const s = built.current.get(first.id)?.api;
    const d = clean(first.data as { time: number }[])[at] as Partial<Point & Ohlc> | undefined;
    if (s && d) c.setCrosshairPosition(d.value ?? d.close ?? 0, d.time as UTCTimestamp, s);
  };

  const drawn = layers.some((l) => l.data.length > 0);
  const readout = hover ? hover.values[first?.id ?? ""] : undefined;
  const spoken = readout && first ? `${(first.format ?? String)((readout as Point).value ?? (readout as Ohlc).close)}` : "";

  return (
    <div
      className="lw"
      data-mode={mode}
      style={{ height: height === "fill" ? "100%" : height }}
      role="group"
      aria-roledescription="chart"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKey}
      onBlur={() => setCursor(null)}
    >
      <div className="lw__canvas" ref={host} />
      {legend && drawn && <div className="lw__legend">{legend(hover)}</div>}
      {tip && hover && (
        <div className="lw__tip" style={{ left: Math.min(Math.max(hover.x, 84), Math.max(84, (host.current?.clientWidth ?? 0) - 84)) }}>
          {tip(hover)}
        </div>
      )}
      {loading && (
        <div className="lw__veil" aria-hidden="true">
          <span className="lw__shimmer" />
        </div>
      )}
      {!loading && !drawn && empty && <div className="lw__veil lw__veil--empty">{empty}</div>}
      <span className="sr-only" aria-live="polite">
        {spoken}
      </span>
    </div>
  );
}
