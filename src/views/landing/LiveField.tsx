import { useQueries } from "@tanstack/react-query";
import { marketById } from "../../config/markets";
import { candlePoints, fetchCandles, type Candle } from "../../lib/candles";
import { cx } from "../../lib/cx";
import { linePathRange, stepGeometry } from "../../lib/steps";
import { useInView } from "./motion";

interface Band {
  id: string;
  way: "left" | "right";
}

/** The closing panel's two, from markets the hero already read, so they cost no more requests. */
export const CLOSING: Band[] = [
  { id: "BTC", way: "left" },
  { id: "WTI", way: "right" },
];

const W = 1000;
const H = 200;

/** A week of hourly candles for a market: about 170, enough detail for a line or a row of candles the width of the page. */
export async function hourlyCandles(coin: string): Promise<Candle[]> {
  const now = Date.now();
  return fetchCandles(coin, "1h", now - 7 * 86_400_000, now);
}

/** The closes of those candles, for a chart that draws a line. */
export const closesOf = (candles: Candle[]): number[] => candlePoints(candles, Date.now()).map((p) => p.v);

/**
 * Full-width charts, one above another, each a real week of a market's hourly closes from Hyperliquid, green where the week rose
 * and red where it fell. They carry no labels: they are a backdrop, not a price board. Each line runs twice side by side and
 * slides by one copy's width on a loop, so it scrolls without end; where the copies meet, the week's last price steps back to its
 * first. A brighter copy of each line shows only through a moving window, so a sweep of light runs along it. A band stays empty
 * until its week has been read, because a made-up line here would read as a market. Nothing moves while it is off screen.
 */
export function ChartBands({ bands, className }: { bands: Band[]; className?: string }) {
  const markets = bands.map((b) => marketById(b.id)!);
  const weeks = useQueries({
    queries: markets.map((m) => ({ queryKey: ["week-1h-candles", m.source], staleTime: 300_000, refetchInterval: 300_000, retry: 1, queryFn: () => hourlyCandles(m.source), select: closesOf })),
  });
  const [ref, playing] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={cx("livefield", className)} data-playing={playing || undefined} aria-hidden="true">
      {bands.map((b, k) => {
        const values = weeks[k].data;
        const g = values && values.length >= 8 ? stepGeometry([...values, ...values], W * 2, H, { top: 10, bottom: 10 }) : null;
        if (!values || !g) return <div key={b.id + k} className="livefield__band" />;
        const move = (values[values.length - 1] / values[0] - 1) * 100;
        const chart = (cls: string) => (
          <svg className={cls} viewBox={`0 0 ${W * 2} ${H}`} preserveAspectRatio="none" focusable="false">
            <path className="livefield__line" d={linePathRange(g, [...values, ...values], 0, values.length * 2)} />
          </svg>
        );
        return (
          <div key={b.id + k} className="livefield__band" data-dir={move >= 0 ? "up" : "down"} data-way={b.way} style={{ ["--k" as string]: k }}>
            {chart("livefield__chart")}
            <div className="livefield__glint">{chart("livefield__chart")}</div>
          </div>
        );
      })}
    </div>
  );
}
