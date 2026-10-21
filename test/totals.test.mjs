// SPDX-License-Identifier: MIT
import test from "node:test";
import assert from "node:assert/strict";
import { summarizeReceipts } from "../src/lib/totals.ts";

const U = (s) => BigInt(Math.round(Number(s) * 1e6)); // decimal tUSDC -> base units

function pos(id, overrides = {}) {
  return {
    id: BigInt(id),
    trader: "0x1111111111111111111111111111111111111111",
    market: 0,
    isLong: true,
    collateral: U(100),
    leverage: 100n,
    notional: U(10_000),
    premium: U(4),
    idxCommit: 0,
    fence: 2,
    commit: { tx: "0x1", block: 1n },
    closeVoids: [],
    ...overrides,
  };
}
const closed = (pnl, carry, winFee, payout) => ({ tx: "0xc", block: 2n, idxCloseFill: 9, oraclePx: 1n, exitPx: 1n, pnl: U(pnl), carryPaid: U(carry), winFee: U(winFee), payout: U(payout), premiumReleased: 0n });
const liquidated = () => ({ tx: "0xl", block: 2n, idx: 9, oraclePx: 1n, caller: "0x2222222222222222222222222222222222222222" });
const fee = (positionId, feeType, amount) => ({ tx: "0xf", block: 2n, feeType, trader: "0x1111111111111111111111111111111111111111", positionId: BigInt(positionId), amount: U(amount) });

test("APP-1: a wallet with only liquidations shows the amount posted as a loss, not +0.00", () => {
  const t = summarizeReceipts([pos(1, { collateral: U(20), liquidated: liquidated() }), pos(2, { collateral: U(40), liquidated: liquidated() })], []);
  assert.equal(t.netResult, -U(60));
  assert.equal(t.grossClosePnl, 0n);
  assert.equal(t.settled, 2);
});

test("APP-1: gross close PnL can be positive while the net result is negative (a liquidation sits next to a winner)", () => {
  // winner: gross +30, carry 0.5, win fee 0.6, premium of 4 kept by the vault -> payout 125.9 on 100 posted
  const t = summarizeReceipts(
    [pos(1, { closed: closed(30, 0.5, 0.6, 125.9) }), pos(2, { collateral: U(40), liquidated: liquidated() }), pos(3, { collateral: U(50) })],
    [],
  );
  assert.equal(t.grossClosePnl, U(30));
  assert.equal(t.netResult, U(25.9) - U(40));
  assert.ok(t.netResult < 0n);
  assert.equal(t.settled, 2); // the third position is still open
});

test("APP-2: fee tiles count what the FeeRouter received, and the IOU shortfall is reported by part", () => {
  // Winner paid only partly: entitlement payout 23,799.33 / win fee 455.50 / carry 0.03, vault paid 11,490.21 so far.
  const p = pos(11, {
    collateral: U(1480),
    closed: closed(22774.856107, 0.02775, 455.497123, 23799.331234),
    iou: {
      traderOwed: U(12337.266166),
      carryOwed: U(0.02775),
      winOwed: U(455.497123),
      traderPaid: U(28.143347),
      carryPaid: 0n,
      winPaid: 0n,
      recorded: { tx: "0xi", block: 2n },
    },
  });
  const t = summarizeReceipts([p], []);
  assert.equal(t.winFeeReceived, 0n); // the FeeRouter got nothing yet, although PositionClosed.winFee is 455.50
  assert.equal(t.carryReceived, 0n);
  assert.equal(t.iouPayout, U(12337.266166) - U(28.143347));
  assert.equal(t.iouWinFee, U(455.497123));
  assert.equal(t.iouCarry, U(0.02775));
  assert.equal(t.netResult, U(23799.331234) - U(1480)); // entitlement, of which iouPayout is still unpaid
});

test("APP-2: once claim() has paid the IOU the tiles equal the entitlements and no IOU is left", () => {
  const p = pos(11, {
    collateral: U(1480),
    closed: closed(22774.856107, 0.02775, 455.497123, 23799.331234),
    iou: {
      traderOwed: U(12337.266166),
      carryOwed: U(0.02775),
      winOwed: U(455.497123),
      traderPaid: U(12337.266166),
      carryPaid: U(0.02775),
      winPaid: U(455.497123),
      recorded: { tx: "0xi", block: 2n },
    },
  });
  // fees collected at close (nothing: the vault could not pay) and by the claim
  const t = summarizeReceipts([p], [fee(11, 1, 0.02775), fee(11, 0, 455.497123)]);
  assert.equal(t.winFeeReceived, p.closed.winFee);
  assert.equal(t.carryReceived, p.closed.carryPaid);
  assert.equal(t.iouPayout + t.iouWinFee + t.iouCarry, 0n);
});

test("fee collections are only counted for the positions in view", () => {
  const a = pos(1, { closed: closed(10, 0.1, 0.2, 109.7) });
  const b = pos(2, { closed: closed(10, 0.1, 0.2, 109.7) });
  const fees = [fee(1, 0, 0.2), fee(1, 1, 0.1), fee(2, 0, 0.2), fee(2, 1, 0.1)];
  const one = summarizeReceipts([a], fees);
  assert.equal(one.winFeeReceived, U(0.2));
  assert.equal(one.carryReceived, U(0.1));
  const both = summarizeReceipts([a, b], fees);
  assert.equal(both.winFeeReceived, U(0.4));
  assert.equal(both.carryReceived, U(0.2));
});
