import { useQuery } from "@tanstack/react-query";

const INFO = "https://api.hyperliquid.xyz/info";

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

/** The candle sizes of the venue's feed that the Basic chart draws from, in milliseconds. */
export const CANDLE_MS = { "1m": MINUTE, "5m": 5 * MINUTE, "15m": 15 * MINUTE, "30m": 30 * MINUTE, "1h": HOUR, "2h": 2 * HOUR, "4h": 4 * HOUR, "1d": DAY } as const;
export type CandleSize = keyof typeof CANDLE_MS;

/** The most candles one request to the venue returns. */
export const MAX_CANDLES = 5000;

export interface RangeDef {
  id: string;
  /** What the chip says. "1m" is a minute and "1M" a month, as on every trading chart. */
  label: string;
  /** What a screen reader says in its place. */
  name: string;
  /** How much time the chart opens on. Zero is all the history there is. */
  ms: number;
  /** Where the line comes from: the oracle's own price updates, which come every few seconds, or the venue's candles. */
  source: "oracle" | "venue";
  /** For the venue: the candle size that makes the span a few hundred points. */
  size?: CandleSize;
  /** How many spans of history are loaded, so the span can be dragged back and zoomed out without waiting. */
  reach: number;
}

/** The timeframes the Basic price chart offers, shortest first. */
export const RANGES = [
  { id: "1min", label: "1m", name: "1 minute", ms: MINUTE, source: "oracle", reach: 5 },
  { id: "5min", label: "5m", name: "5 minutes", ms: 5 * MINUTE, source: "oracle", reach: 4 },
  { id: "15min", label: "15m", name: "15 minutes", ms: 15 * MINUTE, source: "oracle", reach: 3 },
  { id: "1h", label: "1H", name: "1 hour", ms: HOUR, source: "venue", size: "1m", reach: 3 },
  { id: "4h", label: "4H", name: "4 hours", ms: 4 * HOUR, source: "venue", size: "1m", reach: 3 },
  { id: "1d", label: "1D", name: "1 day", ms: DAY, source: "venue", size: "5m", reach: 3 },
  { id: "1w", label: "1W", name: "1 week", ms: 7 * DAY, source: "venue", size: "30m", reach: 3 },
  { id: "1mo", label: "1M", name: "1 month", ms: 30 * DAY, source: "venue", size: "2h", reach: 3 },
  { id: "1y", label: "1Y", name: "1 year", ms: 365 * DAY, source: "venue", size: "1d", reach: 2 },
  { id: "all", label: "All", name: "All history", ms: 0, source: "venue", size: "1d", reach: 1 },
] as const satisfies readonly RangeDef[];
export type Range = (typeof RANGES)[number]["id"];
export const RANGE_IDS = RANGES.map((r) => r.id) as readonly Range[];
export const rangeById = (id: Range): RangeDef => RANGES.find((r) => r.id === id)!;

/** How far back a timeframe loads: the span and then some, so the view can be dragged back. Zero is as far back as there is. */
export const loadMs = (r: RangeDef): number => r.ms * r.reach;

/** The candle sizes the Advanced chart offers, and how much history each loads. */
export const INTERVALS = [
  { id: "1m", label: "1m", ms: 60_000, bars: 720 },
  { id: "5m", label: "5m", ms: 300_000, bars: 720 },
  { id: "15m", label: "15m", ms: 900_000, bars: 720 },
  { id: "1h", label: "1H", ms: 3_600_000, bars: 720 },
  { id: "4h", label: "4H", ms: 14_400_000, bars: 540 },
  { id: "1d", label: "1D", ms: 86_400_000, bars: 365 },
] as const;
export type Interval = (typeof INTERVALS)[number]["id"];
export const INTERVAL_IDS = INTERVALS.map((i) => i.id) as readonly Interval[];

export interface Candle {
  /** Open time and close time, in milliseconds. */
  t: number;
  T: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

interface Raw {
  t: number;
  T: number;
  o: string;
  h: string;
  l: string;
  c: string;
  v: string;
}

export const fromRaw = (r: Raw): Candle => ({ t: r.t, T: r.T, o: Number(r.o), h: Number(r.h), l: Number(r.l), c: Number(r.c), v: Number(r.v) });
const sound = (c: Candle) => [c.o, c.h, c.l, c.c].every(Number.isFinite);

export async function fetchCandles(coin: string, interval: string, from: number, to: number): Promise<Candle[]> {
  const res = await fetch(INFO, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "candleSnapshot", req: { coin, interval, startTime: from, endTime: to } }),
  });
  if (!res.ok) throw new Error(`Hyperliquid answered ${res.status}`);
  return ((await res.json()) as Raw[]).map(fromRaw).filter(sound);
}

/**
 * A market's candles over a span, from the venue the oracle's prices come from. It reads the public candle feed, so it works
 * without a wallet and for markets the contracts do not carry yet. Refreshed while it is on screen.
 */
export function useCandles(coin: string, range: Range, enabled = true) {
  const r = rangeById(range);
  return useQuery({
    queryKey: ["candles", coin, range],
    // The shortest timeframes are drawn from the oracle's own updates, which the venue's candles are too coarse for.
    enabled: enabled && r.source === "venue",
    staleTime: 15_000,
    // A short span moves in minutes and a long one in days.
    refetchInterval: r.ms > 0 && r.ms <= 4 * HOUR ? 20_000 : r.ms === 0 || r.ms >= 365 * DAY ? 300_000 : 60_000,
    retry: 1,
    queryFn: () => {
      const now = Date.now();
      return fetchCandles(coin, r.size!, loadMs(r) === 0 ? 0 : now - loadMs(r), now);
    },
  });
}

/** Many candles of one size, for the Advanced chart. The live socket keeps the newest one moving between refreshes. */
export function useCandleHistory(coin: string, interval: Interval, enabled = true) {
  const i = INTERVALS.find((x) => x.id === interval)!;
  return useQuery({
    queryKey: ["candle-history", coin, interval],
    enabled,
    staleTime: 30_000,
    refetchInterval: 120_000,
    retry: 1,
    queryFn: () => {
      const now = Date.now();
      return fetchCandles(coin, i.id, now - i.ms * i.bars, now);
    },
  });
}

/**
 * The prices a candle series draws: each close at the moment its candle closed, or now for the one still open. The venue stamps a
 * candle's end a millisecond short of the next one's start (14:59:59.999), which is rounded to the second so the axis can label
 * the hour (15:00) and not the minute before it.
 */
export function candlePoints(candles: readonly Candle[], now = Date.now()): { t: number; v: number }[] {
  return candles.map((c) => ({ t: Math.min(Math.round(c.T / 1000) * 1000, now), v: c.c }));
}

/** Folds a candle from the live feed into a history: it replaces the newest candle when it is the same one, or follows it. */
export function mergeCandle(history: readonly Candle[], next: Candle): Candle[] {
  if (history.length === 0) return [next];
  const last = history[history.length - 1];
  if (next.t === last.t) return [...history.slice(0, -1), next];
  if (next.t > last.t) return [...history, next];
  return [...history];
}
