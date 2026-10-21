import { useQuery } from "@tanstack/react-query";

const INFO = "https://api.hyperliquid.xyz/info";

export interface BookLevel {
  px: number;
  /** Size in the market's base units (BTC for BTC). */
  sz: number;
}

export interface Book {
  /** Best price first: bids falling, asks rising. */
  bids: BookLevel[];
  asks: BookLevel[];
  /** When the venue took the snapshot, in milliseconds. */
  time: number;
}

interface Raw {
  time: number;
  levels: [{ px: string; sz: string }[], { px: string; sz: string }[]];
}

const level = (l: { px: string; sz: string }): BookLevel => ({ px: Number(l.px), sz: Number(l.sz) });

/**
 * The venue's order book for a market, a few levels deep, read every couple of seconds while it is on screen. An order fills at the
 * worse of the oracle price and this book's price, so the book is what the Advanced layout shows to explain the gap.
 */
export function useBook(coin: string, enabled = true) {
  return useQuery({
    queryKey: ["book", coin],
    enabled,
    refetchInterval: 2_000,
    staleTime: 1_000,
    retry: 1,
    queryFn: async (): Promise<Book> => {
      const res = await fetch(INFO, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "l2Book", coin }) });
      if (!res.ok) throw new Error(`Hyperliquid answered ${res.status}`);
      const raw = (await res.json()) as Raw;
      return { bids: raw.levels[0].map(level), asks: raw.levels[1].map(level), time: raw.time };
    },
  });
}

/** Running totals of size from the best price outward, for a depth chart. */
export function cumulative(levels: readonly BookLevel[]): { px: number; total: number }[] {
  let total = 0;
  return levels.map((l) => ({ px: l.px, total: (total += l.sz) }));
}
