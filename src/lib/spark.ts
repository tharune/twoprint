import { useQueries } from "@tanstack/react-query";
import { candlePoints, fetchCandles } from "./candles";

/** A week of 4-hour closes for a market: about forty points, enough for a line in a table row. */
async function week(coin: string): Promise<number[]> {
  const now = Date.now();
  const candles = await fetchCandles(coin, "4h", now - 7 * 86_400_000, now);
  return candlePoints(candles, now).map((p) => p.v);
}

/** A week of closing prices for each market, by coin. Cheap to keep: a table of them refreshes every five minutes. */
export function useWeeklyCloses(coins: readonly string[]): Record<string, number[] | undefined> {
  const results = useQueries({
    queries: coins.map((coin) => ({ queryKey: ["week", coin], staleTime: 300_000, refetchInterval: 300_000, retry: 1, queryFn: () => week(coin) })),
  });
  const out: Record<string, number[] | undefined> = {};
  coins.forEach((c, i) => (out[c] = results[i].data));
  return out;
}
