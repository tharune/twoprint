import test from "node:test";
import assert from "node:assert/strict";
import { pnlByMarket, pnlSeries } from "../src/lib/house.js";

// Position 1 and 2 are BTC (market 0) and ETH (market 1): both crypto. Position 9 is not in the ledger.
const positions = new Map([
  [1n, { id: 1n, market: 0 }],
  [2n, { id: 2n, market: 1 }],
]);
const ev = (positionId, vaultDelta, block) => ({ positionId, vaultDelta, premium: 0n, block, tx: "0x" });
const events = [ev(1n, 100n, 10n), ev(2n, -40n, 11n), ev(1n, 25n, 12n), ev(9n, 500n, 13n)];

test("the P&L is the running sum of the vault's settlements, in order", () => {
  const s = pnlSeries(events, positions);
  assert.deepEqual(
    s.map((p) => p.total),
    [100n, 60n, 85n, 585n],
  );
  assert.deepEqual(
    s.map((p) => p.block),
    [10n, 11n, 12n, 13n],
  );
});

test("a vault's own run counts only the settlements of its kind of market", () => {
  assert.deepEqual(
    pnlSeries(events, positions, "crypto").map((p) => p.total),
    [100n, 60n, 85n],
    "the settlement of an unknown position belongs to no vault",
  );
  assert.deepEqual(pnlSeries(events, positions, "stocks"), []);
});

test("each market's total is summed over its own settlements", () => {
  const m = pnlByMarket(events, positions);
  assert.equal(m.get(0), 125n);
  assert.equal(m.get(1), -40n);
  assert.equal(m.size, 2);
});

test("no settlements is an empty series, never a point at zero", () => {
  assert.deepEqual(pnlSeries([], positions), []);
  assert.equal(pnlByMarket([], positions).size, 0);
});
