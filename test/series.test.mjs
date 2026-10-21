import test from "node:test";
import assert from "node:assert/strict";
import { blockClock, feeBars, houseSteps, interestSteps, netOf, pnlSteps, resultBars } from "../src/lib/series.js";

// The ledger knows a block for every event and a time only for the oracle's prints, so an event's time comes from the prints
// around its block. These checks pin that reading and the running totals the Portfolio and House charts draw.

const print = (block, srcTimeMs) => ({ block: BigInt(block), srcTimeMs, oraclePx: 0n, midPx: 0n });
const prints = [[print(100, 10_000), print(200, 20_000), print(300, 40_000)], []];

test("a block between two prints is read off the line through them", () => {
  const at = blockClock(prints);
  assert.equal(at(100n), 10_000);
  assert.equal(at(150n), 15_000);
  assert.equal(at(250n), 30_000);
});

test("a block outside the prints carries on at the pace of the prints", () => {
  const at = blockClock(prints);
  // 30 s over 200 blocks is 150 ms a block
  assert.equal(at(400n), 40_000 + 100 * 150);
  assert.equal(at(0n), 10_000 - 100 * 150);
});

test("with no prints every block is now, so a chart stays flat instead of inventing times", () => {
  const at = blockClock([[], []], 123_456);
  assert.equal(at(5n), 123_456);
});

const pos = (id, commit, extra) => ({ id: BigInt(id), market: 0, collateral: 20_000_000n, commit: { block: BigInt(commit) }, ...extra });
const closed = (block, payout) => ({ closed: { block: BigInt(block), payout: BigInt(payout) } });
const liquidated = (block) => ({ liquidated: { block: BigInt(block) } });

test("what a settled position made is its payout against its collateral, or all of it lost", () => {
  assert.equal(netOf(pos(1, 100, closed(150, 19_000_000))), -1_000_000n);
  assert.equal(netOf(pos(2, 100, closed(150, 25_000_000))), 5_000_000n);
  assert.equal(netOf(pos(3, 100, liquidated(150))), -20_000_000n);
  assert.equal(netOf(pos(4, 100, {})), undefined);
});

test("profit and loss builds up one step per settled position, from zero at the first order", () => {
  const at = blockClock(prints);
  const out = pnlSteps([pos(1, 100, closed(200, 19_000_000)), pos(2, 120, liquidated(300)), pos(3, 250, {})], at);
  assert.ok(out);
  assert.deepEqual(
    out.steps.map((s) => [s.t, s.v]),
    [
      [10_000, 0],
      [20_000, -1],
      [40_000, -21],
    ],
  );
  assert.match(out.steps[1].note, /Closed order #1/);
  assert.match(out.steps[2].note, /Liquidated order #2/);
  assert.equal(pnlSteps([], at), null);
});

const settled = (positionId, block, vaultDelta) => ({ positionId: BigInt(positionId), block: BigInt(block), vaultDelta: BigInt(vaultDelta), premium: 0n });

test("the house's P&L adds each settlement's vault delta, and one vault's run counts only its own markets", () => {
  const at = blockClock(prints);
  const positions = new Map([
    [1n, { id: 1n, market: 0 }],
    [2n, { id: 2n, market: 1 }],
  ]);
  const events = [settled(1, 150, 2_000_000), settled(2, 250, -500_000)];
  const all = houseSteps(events, positions, at);
  assert.deepEqual(
    all.steps.slice(1).map((s) => s.v),
    [2, 1.5],
  );
  const crypto = houseSteps(events, positions, at, "crypto");
  assert.equal(crypto.steps.at(-1).v, 1.5);
  assert.equal(houseSteps(events, positions, at, "stocks"), null);
  assert.equal(houseSteps([], positions, at), null);
});

test("fee and result bars come out oldest first, in tUSDC", () => {
  const at = blockClock(prints);
  const fees = [
    { block: 250n, feeType: 1, amount: 300n, positionId: 2n },
    { block: 150n, feeType: 0, amount: 1_500_000n, positionId: 1n },
  ];
  assert.deepEqual(
    feeBars(fees, at).map((b) => [b.type, b.v]),
    [
      [0, 1.5],
      [1, 0.0003],
    ],
  );
  const bars = resultBars([pos(2, 120, liquidated(300)), pos(1, 100, closed(200, 19_000_000)), pos(3, 250, {})], at);
  assert.deepEqual(
    bars.map((b) => [Number(b.id), b.v, b.liquidated]),
    [
      [1, -1, false],
      [2, -20, true],
    ],
  );
});

test("open interest rises at each fill and falls at each settlement, per side, and a vault counts only its own markets", () => {
  const at = blockClock(prints);
  const held = (id, market, isLong, fill, extra) => ({ id: BigInt(id), market, isLong, notional: 2_000_000_000n, fill: { block: BigInt(fill) }, ...extra });
  const positions = [
    held(1, 0, true, 120, closed(250, 0)),
    held(2, 1, false, 150, {}),
    held(3, 0, true, 180, {}),
    { id: 4n, market: 0, isLong: true, notional: 2_000_000_000n }, // never filled
  ];
  const all = interestSteps(positions, at);
  assert.ok(all);
  assert.deepEqual(all.long.map((s) => s.v), [0, 2000, 4000, 2000]);
  assert.deepEqual(all.short.map((s) => s.v), [0, 2000]);
  assert.match(all.long[3].note, /Closed order #1/);
  assert.equal(interestSteps(positions, at, "stocks"), null);
  assert.equal(interestSteps([], at), null);
  // times never run backwards, and both sides open at the same moment
  for (const side of [all.long, all.short]) for (let i = 1; i < side.length; i++) assert.ok(side[i].t >= side[i - 1].t);
  assert.equal(all.long[0].t, all.short[0].t);
});
