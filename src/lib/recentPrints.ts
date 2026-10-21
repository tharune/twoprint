import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { usePublicClient } from "wagmi";
import { priceRingAbi } from "../abi/generated";
import { DEPLOYMENTS, type ChainId } from "../config/chains";

export interface RecentPrint {
  idx: number;
  /** When the venue signed it, in milliseconds. */
  time: number;
  oraclePx: bigint;
}

/**
 * The newest prints of a market, read by their index from the PriceRing: one count and a handful of reads that the client sends
 * as a single batched call, so the first screen has the real feed in about a second. The event ledger finds the same prints by
 * scanning logs, which takes several seconds on a cold load; this is the fast path for what must show at once. After the first
 * read only the prints that have arrived since are fetched.
 */
export function useRecentPrints(chainId: ChainId, market: number, keep = 72, enabled = true) {
  const client = usePublicClient({ chainId });
  const d = DEPLOYMENTS[chainId];
  const held = useRef<{ key: string; list: RecentPrint[] }>({ key: "", list: [] });
  return useQuery({
    queryKey: ["recent-prints", chainId, market, keep],
    enabled: enabled && !!client && !!d,
    refetchInterval: 3_000,
    staleTime: 2_000,
    retry: 1,
    queryFn: async () => {
      const ring = { address: d!.PriceRing, abi: priceRingAbi } as const;
      const count = Number(await client!.readContract({ ...ring, functionName: "printCount", args: [market] }));
      const key = `${chainId}:${market}`;
      if (held.current.key !== key) held.current = { key, list: [] };
      const have = held.current.list;
      const start = have.length ? Math.min(count, have[have.length - 1].idx + 1) : Math.max(0, count - keep);
      const reads = [];
      for (let i = start; i < count; i++) reads.push(client!.readContract({ ...ring, functionName: "getPrint", args: [market, i] }).then((p) => ({ idx: i, time: Number(p.srcTimeMs), oraclePx: p.oraclePx }) as RecentPrint));
      const next = [...have, ...(await Promise.all(reads))].slice(-keep);
      held.current = { key, list: next };
      return next;
    },
  });
}
