import { useQuery } from "@tanstack/react-query";
import { MARKET_DEFS } from "../config/markets";

/** What Hyperliquid reports for one market: 24 h notional volume and open interest in USD, its mark price and how far that moved in a day. */
export interface VenueStat {
  vol: number;
  oi: number;
  /** The mark price, in USD. */
  px: number;
  /** The change over 24 h, as a fraction: 0.012 is +1.2%. Null when the venue gives no price a day ago. */
  change: number | null;
}

const INFO = "https://api.hyperliquid.xyz/info";

interface Ctx {
  dayNtlVlm: string;
  openInterest: string;
  markPx: string;
  prevDayPx: string;
}

/** One dex's markets, keyed by coin name ("BTC" on the main dex, "xyz:TSLA" on a HIP-3 dex). */
async function dexStats(dex?: string): Promise<Record<string, VenueStat>> {
  const res = await fetch(INFO, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "metaAndAssetCtxs", ...(dex ? { dex } : {}) }),
  });
  if (!res.ok) throw new Error(`Hyperliquid answered ${res.status}`);
  const [meta, ctxs] = (await res.json()) as [{ universe: { name: string }[] }, Ctx[]];
  const out: Record<string, VenueStat> = {};
  meta.universe.forEach((u, i) => {
    const c = ctxs[i];
    if (c) {
      const px = Number(c.markPx);
      const prev = Number(c.prevDayPx);
      out[u.name] = { vol: Number(c.dayNtlVlm), oi: Number(c.openInterest) * px, px, change: prev > 0 ? px / prev - 1 : null };
    }
  });
  return out;
}

const DEXES = [undefined, ...new Set(MARKET_DEFS.filter((d) => d.source.includes(":")).map((d) => d.source.split(":")[0]))];

/**
 * The deepest markets first is the rule for what the venue lists, so the lists show the depth they were ranked by. The figures
 * come from the venue the prices come from. If the read fails the markets are still listed, only without the numbers.
 */
export function useVenueStats(enabled = true) {
  return useQuery({
    queryKey: ["venue-stats"],
    enabled,
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
    queryFn: async () => Object.assign({}, ...(await Promise.all(DEXES.map(dexStats)))) as Record<string, VenueStat>,
  });
}
