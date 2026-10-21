import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "../src/lib/portfolio.js";

// The Portfolio's Performance tab reads these figures off a trader's settled positions. Amounts are tUSDC as plain numbers.

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);
const filled = { block: 10n, fillPx: 1n };
const won = { id: 1n, collateral: 20_000_000n, notional: 2_000_000_000n, leverage: 100n, fill: filled, closed: { block: 20n, payout: 25_000_000n, winFee: 100_000n, carryPaid: 20_000n } };
const lost = { id: 2n, collateral: 20_000_000n, notional: 2_000_000_000n, leverage: 50n, fill: filled, closed: { block: 21n, payout: 19_000_000n, winFee: 0n, carryPaid: 10_000n } };
const liquidated = { id: 3n, collateral: 10_000_000n, notional: 1_000_000_000n, leverage: 100n, fill: filled, liquidated: { block: 22n } };
const open = { id: 4n, collateral: 20_000_000n, notional: 500_000_000n, leverage: 25n, fill: filled };
const cancelled = { id: 5n, collateral: 20_000_000n, notional: 2_000_000_000n, leverage: 100n };

test("a trader with nothing settled has no rates to show, not zeros that look like results", () => {
  const p = performance([open, cancelled]);
  assert.equal(p.settled, 0);
  assert.equal(p.winRate, null);
  assert.equal(p.avgWin, null);
  assert.equal(p.avgLoss, null);
  assert.equal(p.best, null);
  assert.equal(p.worst, null);
  assert.equal(performance([]).avgLeverage, null);
});

test("a win is a payout above the collateral, and a liquidation loses all of it", () => {
  const p = performance([won, lost, liquidated]);
  assert.equal(p.wins, 1);
  assert.equal(p.losses, 2);
  assert.equal(p.settled, 3);
  near(p.winRate, 1 / 3);
  near(p.avgWin, 5);
  near(p.avgLoss, -5.5);
  near(p.best, 5);
  near(p.worst, -10);
});

test("fees are what the closes paid, and an order that never filled adds no size or leverage", () => {
  const p = performance([won, lost, liquidated, open, cancelled]);
  near(p.fees, 0.13); // 0.10 + 0.02 on the win, 0.01 on the loss; a liquidation closes with no fee
  near(p.volume, 5500); // 2000 + 2000 + 1000 + 500, the cancelled order left out
  near(p.avgLeverage, 68.75); // (100 + 50 + 100 + 25) / 4
});
