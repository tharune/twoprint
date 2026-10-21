// SPDX-License-Identifier: MIT
import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateSurplusPool,
  computePositionPricePnl,
  netIdentityPositions,
  DEFAULT_INSURANCE_FLOOR_USDC,
  PER_IDENTITY_WEEKLY_CAP_USDC,
} from "../src/lib/netsplit.ts";

test("app netsplit: calculates 30% weekly surplus above seed and insurance floor", () => {
  const surplus = calculateSurplusPool({
    equity: 120_000n * 10n ** 6n,
    seedDeposited: 50_000n * 10n ** 6n,
    seedWithdrawn: 0n,
    insuranceFloor: DEFAULT_INSURANCE_FLOOR_USDC, // 10k
    weeklyRealizedTradingPnl: 30_000n * 10n ** 6n,
  });

  // Headroom: 120k - 60k = 60k. Trading profit: 30k.
  // Distributable surplus = min(30k, 60k) = 30k.
  // 30% of 30k = 9k.
  assert.equal(surplus.distributableSurplus, 30_000n * 10n ** 6n);
  assert.equal(surplus.poolBudget, 9_000n * 10n ** 6n);
  assert.equal(surplus.reason, null);
});

test("app netsplit: returns 0 budget when house is in trading drawdown", () => {
  const surplus = calculateSurplusPool({
    equity: 100_000n * 10n ** 6n,
    seedDeposited: 50_000n * 10n ** 6n,
    weeklyRealizedTradingPnl: -5_000n * 10n ** 6n,
  });
  assert.equal(surplus.poolBudget, 0n);
  assert.equal(surplus.reason, "house_trading_not_profitable");
});

test("app netsplit: nets across sides and markets on Twoprint", () => {
  const alice = "0x1111111111111111111111111111111111111111";
  const pos1 = {
    state: "Closed",
    isLong: true,
    market: 0,
    entryPx: 60_000n * 10n ** 8n,
    exitPx: 61_200n * 10n ** 8n, // +2% -> +$20
    notional: 1_000n * 10n ** 6n,
  };
  const pos2 = {
    state: "Closed",
    isLong: false,
    market: 1,
    entryPx: 3_000n * 10n ** 8n,
    exitPx: 3_150n * 10n ** 8n, // -5% -> -$50
    notional: 1_000n * 10n ** 6n,
  };

  const res = netIdentityPositions(alice, [pos1, pos2]);
  // Net price loss = 50 - 20 = $30 -> capped at $25
  assert.equal(res.twoprintNetPnl, -30_000_000n);
  assert.equal(res.netPriceLoss, 30_000_000n);
  assert.equal(res.cappedLoss, PER_IDENTITY_WEEKLY_CAP_USDC);
  assert.equal(res.isHedged, false);
});

test("app netsplit: hedged pair receives $0 allocation", () => {
  const whale = "0x9999999999999999999999999999999999999999";
  // Twoprint Long liquidated: -$100 loss
  const tpPos = {
    state: "Liquidated",
    collateral: 100n * 10n ** 6n,
    premium: 0n,
  };
  // Hyperliquid Short gain: +$100
  const hlGain = 100n * 10n ** 6n;

  const res = netIdentityPositions(whale, [tpPos], hlGain);
  assert.equal(res.twoprintNetPnl, -100_000_000n);
  assert.equal(res.hlOffsetPnl, 100_000_000n);
  assert.equal(res.overallNetPnl, 0n);
  assert.equal(res.isHedged, true);
  assert.equal(res.netPriceLoss, 0n);
  assert.equal(res.cappedLoss, 0n);
});
