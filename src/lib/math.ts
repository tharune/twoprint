// Mirrors of the on-chain RiskMath used for DISPLAY only (the chain is the source of truth).

/** floor division toward −∞ (RiskMath.floorDiv) */
export function floorDiv(a: bigint, b: bigint): bigint {
  const q = a / b;
  return a % b !== 0n && (a < 0n) !== (b < 0n) ? q - 1n : q;
}

/** Mark PnL at a print's oraclePx (no worse-of on the mark): notional × (px − entry) / entry, floored. */
export function markPnl(entryPx: bigint, oraclePx: bigint, notional: bigint, isLong: boolean): bigint {
  if (entryPx === 0n) return 0n;
  const diff = isLong ? oraclePx - entryPx : entryPx - oraclePx;
  return floorDiv(notional * diff, entryPx);
}

/** Basis-adjusted mid: mid − oracle × basisEwma (RiskMath.worseOfFill's adjMid). */
export function adjMid(oraclePx: bigint, midPx: bigint, basisEwmaE8: bigint): bigint {
  return midPx - (oraclePx * basisEwmaE8) / 100_000_000n;
}

/** Worse-of fill, directional, capped at maxAdjE8 (RiskMath.worseOfFill). */
export function worseOf(oraclePx: bigint, midPx: bigint, basisEwmaE8: bigint, isBuy: boolean, maxAdjE8: bigint): bigint {
  const a = adjMid(oraclePx, midPx, basisEwmaE8);
  const cap = (oraclePx * maxAdjE8) / 100_000_000n;
  if (isBuy) {
    if (a <= oraclePx) return oraclePx;
    const up = a - oraclePx;
    return oraclePx + (up > cap ? cap : up);
  }
  if (a >= oraclePx) return oraclePx;
  const down = oraclePx - a;
  return oraclePx - (down > cap ? cap : down);
}

/** Liquidation / bankruptcy price on margin (RiskMath.liqPrice). */
export function liqPrice(entryPx: bigint, margin: bigint, notional: bigint, isLong: boolean): bigint {
  if (notional === 0n) return 0n;
  const dist = (entryPx * margin) / notional;
  if (isLong) {
    return dist >= entryPx ? 0n : entryPx - dist;
  }
  return entryPx + dist;
}
