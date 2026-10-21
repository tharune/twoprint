// SPDX-License-Identifier: MIT
/**
 * Net Split arithmetic, so the app can preview it: the weekly pool (30% of what the house won, above the seed and an
 * insurance floor) and an identity's eligible loss after netting its positions against each other and against an
 * offsetting Hyperliquid P&L. The weekly allocation itself is computed off-chain, and nothing here moves funds.
 */

export function floorDiv(a: bigint, b: bigint): bigint {
  let q = a / b;
  if (a % b !== 0n && (a < 0n) !== (b < 0n)) {
    q -= 1n;
  }
  return q;
}

const NET_SPLIT_SHARE_BPS = 3000n; // 30%
const BPS_DIVISOR = 10000n;
export const DEFAULT_INSURANCE_FLOOR_USDC = 10_000n * 10n ** 6n; // $10,000
export const PER_IDENTITY_WEEKLY_CAP_USDC = 25n * 10n ** 6n; // $25

export interface SurplusMetrics {
  equity: bigint;
  seedOutstanding: bigint;
  insuranceFloor: bigint;
  surplusAboveFloor: bigint;
  weeklyRealizedTradingPnl: bigint;
  distributableSurplus: bigint;
  poolBudget: bigint;
  reason: string | null;
}

export function calculateSurplusPool({
  equity,
  seedDeposited,
  seedWithdrawn = 0n,
  insuranceFloor = DEFAULT_INSURANCE_FLOOR_USDC,
  weeklyRealizedTradingPnl,
  splitBps = NET_SPLIT_SHARE_BPS,
}: {
  equity: bigint;
  seedDeposited: bigint;
  seedWithdrawn?: bigint;
  insuranceFloor?: bigint;
  weeklyRealizedTradingPnl: bigint;
  splitBps?: bigint;
}): SurplusMetrics {
  const seedOutstanding = seedDeposited > seedWithdrawn ? seedDeposited - seedWithdrawn : 0n;
  const baseReq = seedOutstanding + insuranceFloor;
  const surplusAboveFloor = equity > baseReq ? equity - baseReq : 0n;

  if (weeklyRealizedTradingPnl <= 0n) {
    return {
      equity,
      seedOutstanding,
      insuranceFloor,
      surplusAboveFloor,
      weeklyRealizedTradingPnl,
      distributableSurplus: 0n,
      poolBudget: 0n,
      reason: "house_trading_not_profitable",
    };
  }

  if (surplusAboveFloor <= 0n) {
    return {
      equity,
      seedOutstanding,
      insuranceFloor,
      surplusAboveFloor: 0n,
      weeklyRealizedTradingPnl,
      distributableSurplus: 0n,
      poolBudget: 0n,
      reason: "equity_below_insurance_floor",
    };
  }

  const distributableSurplus =
    weeklyRealizedTradingPnl < surplusAboveFloor ? weeklyRealizedTradingPnl : surplusAboveFloor;
  const poolBudget = (distributableSurplus * splitBps) / BPS_DIVISOR;

  return {
    equity,
    seedOutstanding,
    insuranceFloor,
    surplusAboveFloor,
    weeklyRealizedTradingPnl,
    distributableSurplus,
    poolBudget,
    reason: null,
  };
}

/** The vault's trading P&L to date: premiums plus trader losses, minus trader profits paid. */
export function houseTradingPnl(v: { premiumsReceived: bigint; tradingInflow: bigint; tradingOutflow: bigint }): bigint {
  return v.premiumsReceived + v.tradingInflow - v.tradingOutflow;
}

export function computePositionPricePnl(position: {
  state?: string;
  liquidated?: unknown;
  collateral?: bigint;
  premium?: bigint;
  entryPx?: bigint;
  exitPx?: bigint;
  notional?: bigint;
  isLong?: boolean;
}): bigint {
  if (position.state === "Liquidated" || position.liquidated) {
    const collateral = position.collateral ?? 0n;
    const premium = position.premium ?? 0n;
    const margin = collateral > premium ? collateral - premium : 0n;
    return -margin;
  }

  if (position.state === "Closed" || position.exitPx != null) {
    const entryPx = position.entryPx ?? 0n;
    const exitPx = position.exitPx ?? entryPx;
    const notional = position.notional ?? 0n;
    const isLong = Boolean(position.isLong);
    if (entryPx === 0n) return 0n;
    const diff = isLong ? exitPx - entryPx : entryPx - exitPx;
    return floorDiv(notional * diff, entryPx);
  }

  return 0n;
}

export interface IdentityNettingResult {
  identity: string;
  twoprintNetPnl: bigint;
  twoprintLongPnl: bigint;
  twoprintShortPnl: bigint;
  twoprintBtcPnl: bigint;
  twoprintEthPnl: bigint;
  hlOffsetPnl: bigint;
  overallNetPnl: bigint;
  isHedged: boolean;
  netPriceLoss: bigint;
  cappedLoss: bigint;
  positionCount: number;
}

export function netIdentityPositions(
  identity: string,
  twoprintPositions: Array<{
    state?: string;
    liquidated?: unknown;
    collateral?: bigint;
    premium?: bigint;
    entryPx?: bigint;
    exitPx?: bigint;
    notional?: bigint;
    isLong?: boolean;
    market?: number;
  }>,
  hlOffsetPnl = 0n,
  perIdentityCap = PER_IDENTITY_WEEKLY_CAP_USDC
): IdentityNettingResult {
  let twoprintLongPnl = 0n;
  let twoprintShortPnl = 0n;
  let twoprintBtcPnl = 0n;
  let twoprintEthPnl = 0n;
  let twoprintNetPnl = 0n;

  for (const pos of twoprintPositions) {
    const pnl = computePositionPricePnl(pos);
    twoprintNetPnl += pnl;

    if (pos.isLong) twoprintLongPnl += pnl;
    else twoprintShortPnl += pnl;

    const m = Number(pos.market ?? 0);
    if (m === 0) twoprintBtcPnl += pnl;
    else if (m === 1) twoprintEthPnl += pnl;
  }

  const overallNetPnl = twoprintNetPnl + hlOffsetPnl;
  const isHedged = twoprintNetPnl < 0n && overallNetPnl >= 0n;
  const netPriceLoss = overallNetPnl < 0n ? -overallNetPnl : 0n;
  const cappedLoss = netPriceLoss > perIdentityCap ? perIdentityCap : netPriceLoss;

  return {
    identity: identity.toLowerCase(),
    twoprintNetPnl,
    twoprintLongPnl,
    twoprintShortPnl,
    twoprintBtcPnl,
    twoprintEthPnl,
    hlOffsetPnl,
    overallNetPnl,
    isHedged,
    netPriceLoss,
    cappedLoss,
    positionCount: twoprintPositions.length,
  };
}
