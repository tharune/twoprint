// What the landing page says about the oracle.
import { ago } from "./format";

export type FeedState = "reading" | "live" | "stale" | "frozen";

/** The `.live-dot` state that goes with each feed state. */
export const FEED_DOT = { live: "ok", stale: "bad", frozen: "bad", reading: "idle" } as const satisfies Record<FeedState, string>;

export interface FeedView {
  state: FeedState;
  /** "Live", "Stale", "Not updating" or "Loading". */
  label: string;
  /** How long ago the last print was signed (live) or posted (stale), in the app's wording. Empty while unknown. */
  age: string;
}

interface RingSnapshot {
  fetchedAt: number;
  ring: { isFresh: boolean; lastSrcTimeMs: bigint; lastPostTimestamp: bigint; maxAgeSec?: number };
}

/**
 * The snapshot is re-read every 1 to 2 s. If those reads stop landing (a throttled or unreachable RPC) the last numbers stay on
 * screen, so a snapshot older than 10 s is "not updating", never "live". A fresh read of a feed the contract calls stale is
 * "stale", with the time since its last post. The ring's isFresh() is evaluated at the latest block's timestamp, and this chain makes
 * no empty blocks: with the keeper down and nobody else sending it stays true for hours. So a post older than the ring's limit
 * (plus a few seconds for clocks and latency) on this clock is stale whatever isFresh() says (api/_lib/chain.ts feedState does the same).
 */
export function feedView(snap: RingSnapshot | undefined, now: number): FeedView {
  if (!snap) return { state: "reading", label: "Loading", age: "" };
  if (now - snap.fetchedAt > 10_000) return { state: "frozen", label: "Not updating", age: "" };
  const posted = Number(snap.ring.lastPostTimestamp) * 1000;
  const recent = posted === 0 || now - posted <= ((snap.ring.maxAgeSec ?? 10) + 5) * 1000;
  if (snap.ring.isFresh && recent) return { state: "live", label: "Live", age: ago(now - Number(snap.ring.lastSrcTimeMs)) };
  return { state: "stale", label: "Stale", age: posted > 0 ? ago(now - posted) : "" };
}

/** A value against its cap, as a percentage from 0 to 100. A cap of zero reads as 0. */
export function capShare(value: bigint, cap: bigint): number {
  if (cap <= 0n) return 0;
  return Math.min(100, Number((value * 10_000n) / cap) / 100);
}
