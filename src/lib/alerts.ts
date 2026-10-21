/** How near a position is to its liquidation price, in the tiers the app warns at: 15%, 7% and 3% of the distance left. */

import { floorDiv } from "./netsplit";

const ALERT_TIERS = {
  BREACHED: "BREACHED",
  CRITICAL: "CRITICAL",
  DANGER: "DANGER",
  WARNING: "WARNING",
  SAFE: "SAFE",
} as const;

export type AlertTier = (typeof ALERT_TIERS)[keyof typeof ALERT_TIERS];

const THRESHOLDS = {
  CRITICAL_BUFFER_BPS: 300n, // 3%
  DANGER_BUFFER_BPS: 700n, // 7%
  WARNING_BUFFER_BPS: 1500n, // 15%
};

export interface LiquidationDistanceResult {
  distPx: bigint;
  totalLiqDistPx: bigint;
  distRatioBps: bigint;
  priceDistPct: number;
  pnl: bigint;
  remainingEquity: bigint;
  marginRatioBps: bigint;
  marginRemainingPct: number;
  bufferBps: bigint;
  bufferRemainingPct: number;
  alertTier: AlertTier;
  isCrossed: boolean;
}

export function computeLiquidationDistance({
  oraclePx,
  entryPx,
  liqPx,
  margin,
  notional,
  isLong,
}: {
  oraclePx: bigint;
  entryPx: bigint;
  liqPx: bigint;
  margin: bigint;
  notional: bigint;
  isLong: boolean;
}): LiquidationDistanceResult {
  if (entryPx === 0n || liqPx === 0n) {
    return {
      distPx: 0n,
      totalLiqDistPx: 0n,
      distRatioBps: 10000n,
      priceDistPct: 100,
      pnl: 0n,
      remainingEquity: margin,
      marginRatioBps: 10000n,
      marginRemainingPct: 100,
      bufferBps: 10000n,
      bufferRemainingPct: 100,
      alertTier: ALERT_TIERS.SAFE,
      isCrossed: false,
    };
  }

  const distPx = isLong ? oraclePx - liqPx : liqPx - oraclePx;
  const totalLiqDistPx = isLong ? entryPx - liqPx : liqPx - entryPx;

  const distRatioBps =
    totalLiqDistPx > 0n
      ? distPx <= 0n
        ? 0n
        : (distPx * 10000n) / totalLiqDistPx
      : 0n;

  const pnlDiff = isLong ? oraclePx - entryPx : entryPx - oraclePx;
  const pnl = entryPx > 0n ? floorDiv(notional * pnlDiff, entryPx) : 0n;

  const remainingEquity = margin + pnl;
  const marginRatioBps =
    margin > 0n ? (remainingEquity <= 0n ? 0n : (remainingEquity * 10000n) / margin) : 0n;

  const bufferBps = marginRatioBps < distRatioBps ? marginRatioBps : distRatioBps;

  let alertTier: AlertTier = ALERT_TIERS.SAFE;

  if (distPx <= 0n || remainingEquity <= 0n) {
    alertTier = ALERT_TIERS.BREACHED;
  } else if (bufferBps <= THRESHOLDS.CRITICAL_BUFFER_BPS) {
    alertTier = ALERT_TIERS.CRITICAL;
  } else if (bufferBps <= THRESHOLDS.DANGER_BUFFER_BPS) {
    alertTier = ALERT_TIERS.DANGER;
  } else if (bufferBps <= THRESHOLDS.WARNING_BUFFER_BPS) {
    alertTier = ALERT_TIERS.WARNING;
  }

  return {
    distPx,
    totalLiqDistPx,
    distRatioBps,
    priceDistPct: Number(distRatioBps) / 100,
    pnl,
    remainingEquity,
    marginRatioBps,
    marginRemainingPct: Number(marginRatioBps) / 100,
    bufferBps,
    bufferRemainingPct: Number(bufferBps) / 100,
    alertTier,
    isCrossed: distPx <= 0n,
  };
}
