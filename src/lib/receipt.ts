import type { PositionRecord, PrintEv } from "../hooks/data";
import { diffBp, e8ToBp } from "./format.ts";
import { adjMid } from "./math.ts";

export interface SurvivalReceipt {
  positionId: bigint;
  market: number;
  isLong: boolean;
  breachPrint: PrintEv;
  liqPx: bigint;
  /** the breach print's oracle price: the field the receipt (and liquidation) is judged on */
  oraclePx: bigint;
  /** the book mid and basis-adjusted mid at that print, for context only */
  midPx: bigint;
  adjMidPx: bigint;
  /** how far oraclePx went past the level, bp of the level */
  beyondBp: number;
  basisEwmaBp: number;
  survivedPrints: number;
  kRequired: number;
  survivedSafely: boolean;
  closedAfterBreach: boolean;
}

/** The liquidation level in force at print `idx`: the fill level, moved by every add-margin whose effective print is <= idx. */
export function levelAt(p: PositionRecord, idx: number): bigint | undefined {
  if (!p.fill) return undefined;
  let level = p.fill.liqPx;
  for (const a of p.marginAdds ?? []) if (a.idxEffective <= idx) level = a.newLiqPx;
  return level;
}

/** The level in force now (every add that has taken effect). */
export const levelNow = (p: PositionRecord) => levelAt(p, Number.MAX_SAFE_INTEGER);

/** The position in a list ordered by print index of the first print after `idx`. */
function firstAfter(prints: PrintEv[], idx: number): number {
  let lo = 0;
  let hi = prints.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (prints[mid].idx <= idx) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** A print at or beyond the level in force at it, judged on oraclePx: the only field the liquidation rule reads (PositionManager). */
function oracleBeyond(p: PositionRecord, q: PrintEv): boolean {
  const lv = levelAt(p, q.idx)!;
  return p.isLong ? q.oraclePx <= lv : q.oraclePx >= lv;
}

/**
 * A survival receipt exists only when an oracle print reached the liquidation level (at or beyond it, as the contract judges a
 * breach, which consumes the premium) and the position then survived at least `k` prints or was closed. It is judged on
 * oraclePx only, the field liquidation reads. The Hyperliquid book mid is not used: a push on the book moves the mid, not the
 * oracle, and a mid that crossed the level never put the position at risk, so it must not earn a receipt.
 * "Survives" means the position was not liquidated and none of those k prints is itself an oracle breach (one breach print may
 * be pending its second). "Closed safely" means the close paid out something: a close that leaves payout 0 (equity wiped at
 * the breach print) is not a survival. A liquidated position never gets one.
 */
export function evaluateSurvivalReceipt(
  p: PositionRecord,
  marketPrints: PrintEv[],
  k = 1
): SurvivalReceipt | null {
  if (!p.fill || p.liquidated) return null;
  const fillIdx = p.fill.idxFill;
  const endIdx = p.closed?.idxCloseFill ?? Infinity;
  const closedSafely = !!p.closed && p.closed.payout > 0n;
  if (p.closed && !closedSafely) return null;

  for (let i = firstAfter(marketPrints, fillIdx); i < marketPrints.length; i++) {
    const pr = marketPrints[i];
    if (pr.idx > endIdx) break;
    const liqPx = levelAt(p, pr.idx)!; // the level in force at this print, not the level after a later add
    if (!oracleBeyond(p, pr)) continue;

    // Two consecutive oracle prints beyond the level make a pair: the contract's scan liquidates on it at the next settle even if
    // later prints came back inside, so a breach that completes a pair is no wick (the forward check below only sees the next k prints).
    const prev = marketPrints.find((q) => q.idx === pr.idx - 1);
    if (prev && prev.idx > fillIdx && oracleBeyond(p, prev)) continue;

    const latestIdx = marketPrints.length > 0 ? marketPrints[marketPrints.length - 1].idx : pr.idx;
    const actualEnd = endIdx === Infinity ? latestIdx : endIdx;
    const survivedCount = Math.max(0, actualEnd - pr.idx);

    // The k prints after the breach must not be oracle breaches themselves (liquidation needs two in a row).
    const after = marketPrints.filter((q) => q.idx > pr.idx).slice(0, k);
    if (!closedSafely && after.some((q) => oracleBeyond(p, q))) continue;

    // Surviving means at least k prints after the breach print: a paid close filled AT the breach print is an exit, not a survival.
    if (survivedCount >= k) {
      return {
        positionId: p.id,
        market: p.market,
        isLong: p.isLong,
        breachPrint: pr,
        liqPx,
        oraclePx: pr.oraclePx,
        midPx: pr.midPx,
        adjMidPx: adjMid(pr.oraclePx, pr.midPx, BigInt(pr.basisEwmaE8)),
        beyondBp: Math.abs(p.isLong ? diffBp(pr.oraclePx, liqPx) : diffBp(liqPx, pr.oraclePx)),
        basisEwmaBp: e8ToBp(pr.basisEwmaE8),
        survivedPrints: Math.max(k, survivedCount),
        kRequired: k,
        survivedSafely: true,
        closedAfterBreach: !!p.closed && p.closed.idxCloseFill >= pr.idx,
      };
    }
  }

  return null;
}
