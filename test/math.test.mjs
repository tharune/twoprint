import test from "node:test";
import assert from "node:assert/strict";
import { floorDiv, markPnl, adjMid, worseOf, liqPrice } from "../src/lib/math.js";
import { marginTooThin, commitAddMarginRequest } from "../src/lib/protocol.js";

test("math: floorDiv floors toward -infinity", () => {
  assert.equal(floorDiv(7n, 3n), 2n);
  assert.equal(floorDiv(-7n, 3n), -3n);
  assert.equal(floorDiv(7n, -3n), -3n);
  assert.equal(floorDiv(-7n, -3n), 2n);
  assert.equal(floorDiv(6n, 3n), 2n);
  assert.equal(floorDiv(-6n, 3n), -2n);
});

test("math: markPnl calculates signed PnL on notional", () => {
  const notional = 1_000_000_000n; // 1000 USDC
  const entryPx = 80_000_00000000n; // $80,000
  const higherPx = 84_000_00000000n; // $84,000 (+5%)
  const lowerPx = 76_000_00000000n; // $76,000 (-5%)

  // Long
  assert.equal(markPnl(entryPx, higherPx, notional, true), 50_000_000n); // +50 USDC
  assert.equal(markPnl(entryPx, lowerPx, notional, true), -50_000_000n); // -50 USDC

  // Short
  assert.equal(markPnl(entryPx, higherPx, notional, false), -50_000_000n); // -50 USDC
  assert.equal(markPnl(entryPx, lowerPx, notional, false), 50_000_000n); // +50 USDC

  // Zero entry edge case
  assert.equal(markPnl(0n, higherPx, notional, true), 0n);
});

test("math: liqPrice accurately mirrors on-chain RiskMath.liqPrice", () => {
  const entry = 80_000_00000000n; // $80,000
  const notional = 800_000_000n; // $800
  const margin = 40_000_000n; // $40 margin (5% buffer)

  // Long: entry - (entry * margin / notional) = 80,000 - 4,000 = 76,000
  const liqLong = liqPrice(entry, margin, notional, true);
  assert.equal(liqLong, 76_000_00000000n);

  // Short: entry + (entry * margin / notional) = 80,000 + 4,000 = 84,000
  const liqShort = liqPrice(entry, margin, notional, false);
  assert.equal(liqShort, 84_000_00000000n);

  // Adding margin lowers the long liquidation price
  const addMargin = 10_000_000n; // +$10
  const newLiqLong = liqPrice(entry, margin + addMargin, notional, true);
  assert.equal(newLiqLong, 75_000_00000000n);
  assert.ok(newLiqLong < liqLong);

  // Dist >= entry bounds at 0
  const hugeMargin = 1_000_000_000n; // $1000 margin on $800 notional
  assert.equal(liqPrice(entry, hugeMargin, notional, true), 0n);

  // Zero notional returns 0n
  assert.equal(liqPrice(entry, margin, 0n, true), 0n);
});

test("protocol: marginTooThin validates margin safety bounds", () => {
  const notional = 2_000_000_000n; // 2,000 USDC
  const maxFillAdjE8 = 150_000; // 15 bp
  // minNetMargin = 2000 * 0.0015 * 2 = 6 USDC = 6_000_000

  // Collateral <= premium is too thin
  assert.equal(marginTooThin(20_000_000n, 20_000_000n, notional, maxFillAdjE8), true);
  assert.equal(marginTooThin(20_000_000n, 25_000_000n, notional, maxFillAdjE8), true);

  // Net margin = 5 USDC < 6 USDC is too thin
  assert.equal(marginTooThin(20_000_000n, 15_000_000n, notional, maxFillAdjE8), true);

  // Net margin = 10 USDC > 6 USDC is valid
  assert.equal(marginTooThin(20_000_000n, 10_000_000n, notional, maxFillAdjE8), false);
});

test("protocol: commitAddMarginRequest constructs valid payload", () => {
  const mockDeployment = { PositionManager: "0x1234567890123456789012345678901234567890" };
  const req = commitAddMarginRequest(mockDeployment, 42n, 15_000_000n);
  assert.equal(req.address, "0x1234567890123456789012345678901234567890");
  assert.equal(req.functionName, "commitAddMargin");
  assert.deepEqual(req.args, [42n, 15_000_000n]);
});
