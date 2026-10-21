import test from "node:test";
import assert from "node:assert/strict";
import { evaluateSurvivalReceipt, levelAt, levelNow } from "../src/lib/receipt.js";

// Helper to construct a mock position
function mockPosition(overrides = {}) {
  return {
    id: 1n,
    trader: "0x1111111111111111111111111111111111111111",
    market: 0,
    isLong: true,
    collateral: 20_000_000n, // 20 tUSDC
    leverage: 100n,
    notional: 2_000_000_000n,
    premium: 1_500_000n,
    idxCommit: 0,
    fence: 2,
    commit: { tx: "0x1", block: 100n },
    fill: {
      tx: "0x2",
      block: 102n,
      idxFill: 2,
      oraclePx: 80_000_00000000n,
      midPx: 80_000_00000000n,
      basisEwmaE8: 0,
      fillPx: 80_000_00000000n,
      liqPx: 79_260_00000000n, // liq level at ~79,260
    },
    closeVoids: [],
    ...overrides,
  };
}

// Helper to construct mock prints
function mockPrint(idx, oraclePx, midPx, basisEwmaE8 = 0) {
  return {
    idx,
    oraclePx,
    midPx,
    srcTimeMs: 1700000000000 + idx * 3000,
    arbBlock: 100 + idx,
    block: BigInt(100 + idx),
    basisEwmaE8,
  };
}

test("survival receipt: long survives an isolated wick where the oracle price breaches liqPx", () => {
  const p = mockPosition({ isLong: true });
  // Fill is at idx 2 (liqPx = 79,260).
  // At print 3 the oracle dips to 79,200 < 79,260 (breach: the premium is consumed). Next prints 4, 5 recover to 79,800.
  const prints = [
    mockPrint(2, 80_000_00000000n, 80_000_00000000n, 0),
    mockPrint(3, 79_200_00000000n, 79_500_00000000n, 0), // oracle breach by 60; the mid stayed above the level
    mockPrint(4, 79_800_00000000n, 79_800_00000000n, 0), // recovery
    mockPrint(5, 79_900_00000000n, 79_900_00000000n, 0),
  ];

  const rec = evaluateSurvivalReceipt(p, prints, 1);
  assert.ok(rec !== null, "Expected survival receipt to fire");
  assert.equal(rec.positionId, 1n);
  assert.equal(rec.breachPrint.idx, 3);
  assert.equal(rec.survivedSafely, true);
  assert.ok(Math.abs(rec.beyondBp - 7.57) < 0.01, "79,200 is 7.57 bp past 79,260");
  assert.equal(rec.oraclePx, 79_200_00000000n);
});

test("survival receipt: a book mid below the level (here a routine basis) with the oracle inside it is no receipt", () => {
  const p = mockPosition({ isLong: true });
  // liqPx = 79,260.
  // At print 3: midPx is 79,250 (< 79,260), BUT basisEwmaE8 is positive (+50 bp = +500_000).
  // Expected basis shift: oraclePx * basisEwma / 1e8 = 79,500 * 500,000 / 1e8 = 397.5.
  // adjMid = midPx - (oraclePx * basis) = 79,250 - 397.5 = 78,852.5...
  // Wait, if basis is negative (-100 bp = -1_000_000), i.e. mid normally trades below oracle:
  // Expected discount: mid is 79,250, but oracle is 80,000 with basisEwma = -1_000_000 (-100 bp).
  // adjMid = 79,250 - (80,000 * (-1_000_000) / 1e8) = 79,250 + 800 = 80,050 > liqPx!
  const prints = [
    mockPrint(2, 80_000_00000000n, 80_000_00000000n, 0),
    mockPrint(3, 80_000_00000000n, 79_250_00000000n, -1_000_000), // raw mid is 79,250, but adjusted is 80,050
    mockPrint(4, 80_000_00000000n, 80_000_00000000n, 0),
  ];

  const rec = evaluateSurvivalReceipt(p, prints, 1);
  assert.equal(rec, null, "only the oracle price can breach");
});

test("survival receipt: short position survives a wick above liquidation level", () => {
  const p = mockPosition({
    isLong: false,
    fill: {
      tx: "0x2",
      block: 102n,
      idxFill: 2,
      oraclePx: 80_000_00000000n,
      midPx: 80_000_00000000n,
      basisEwmaE8: 0,
      fillPx: 80_000_00000000n,
      liqPx: 80_740_00000000n, // short liq level above entry
    },
  });

  // At print 3: mid spikes to 80,900 (> 80,740)
  // Subsequent prints 4 and 5 recover to 80,200
  const prints = [
    mockPrint(2, 80_000_00000000n, 80_000_00000000n, 0),
    mockPrint(3, 80_760_00000000n, 80_900_00000000n, 0), // oracle spike beyond 80,740
    mockPrint(4, 80_200_00000000n, 80_200_00000000n, 0), // recovery
    mockPrint(5, 80_100_00000000n, 80_100_00000000n, 0),
  ];

  const rec = evaluateSurvivalReceipt(p, prints, 1);
  assert.ok(rec !== null);
  assert.equal(rec.isLong, false);
  assert.equal(rec.breachPrint.idx, 3);
  assert.ok(rec.survivedPrints >= 1);
});

test("survival receipt: immediate liquidation on the next print does NOT get a survival receipt", () => {
  const p = mockPosition({
    isLong: true,
    liquidated: {
      tx: "0xliq",
      block: 104n,
      idx: 4, // liquidated at print 4 (consecutive after 3)
      oraclePx: 79_100_00000000n,
      caller: "0x2222222222222222222222222222222222222222",
    },
  });

  const prints = [
    mockPrint(2, 80_000_00000000n, 80_000_00000000n, 0),
    mockPrint(3, 79_500_00000000n, 79_200_00000000n, 0),
    mockPrint(4, 79_100_00000000n, 79_100_00000000n, 0), // second consecutive breach -> liquidated
  ];

  const rec = evaluateSurvivalReceipt(p, prints, 1);
  assert.equal(rec, null, "Immediate consecutive liquidation should not receive a survival receipt");
});

test("survival receipt: a wick followed by a later liquidation does NOT get a receipt (MMN-3)", () => {
  const p = mockPosition({
    isLong: true,
    liquidated: { tx: "0xliq", block: 110n, idx: 8, oraclePx: 79_100_00000000n, caller: "0x2222222222222222222222222222222222222222" },
  });
  const prints = [
    mockPrint(2, 80_000_00000000n, 80_000_00000000n, 0),
    mockPrint(3, 79_250_00000000n, 79_250_00000000n, 0), // isolated wick beyond 79,260
    mockPrint(4, 79_900_00000000n, 79_900_00000000n, 0),
    mockPrint(5, 79_900_00000000n, 79_900_00000000n, 0),
    mockPrint(6, 79_900_00000000n, 79_900_00000000n, 0),
    mockPrint(7, 79_200_00000000n, 79_200_00000000n, 0),
    mockPrint(8, 79_100_00000000n, 79_100_00000000n, 0), // the liquidating pair 7, 8
  ];
  assert.equal(evaluateSurvivalReceipt(p, prints, 1), null, "a liquidated position did not survive");
});

test("survival receipt: a close that paid nothing at the breach print does NOT get a receipt (MMN-3)", () => {
  const p = mockPosition({
    isLong: true,
    closed: { tx: "0xclose", block: 105n, idxCloseFill: 3, oraclePx: 79_250_00000000n, exitPx: 79_250_00000000n, pnl: -750_000_00n, carryPaid: 0n, winFee: 0n, payout: 0n, premiumReleased: 0n },
  });
  const prints = [mockPrint(2, 80_000_00000000n, 80_000_00000000n, 0), mockPrint(3, 79_250_00000000n, 79_250_00000000n, 0)];
  assert.equal(evaluateSurvivalReceipt(p, prints, 1), null, "payout 0 means the margin was wiped out");
});

test("survival receipt: two consecutive oracle prints beyond the level that nobody has settled yet are not a wick (MMN-3)", () => {
  const p = mockPosition({ isLong: true });
  const prints = [
    mockPrint(2, 80_000_00000000n, 80_000_00000000n, 0),
    mockPrint(3, 79_250_00000000n, 79_250_00000000n, 0),
    mockPrint(4, 79_240_00000000n, 79_240_00000000n, 0),
    mockPrint(5, 79_240_00000000n, 79_240_00000000n, 0),
  ];
  assert.equal(evaluateSurvivalReceipt(p, prints, 1), null, "the next settle liquidates this position");
});

test("survival receipt: a wick followed by a close that pays out still gets a receipt (MMN-3)", () => {
  const p = mockPosition({
    isLong: true,
    closed: { tx: "0xclose", block: 108n, idxCloseFill: 6, oraclePx: 79_900_00000000n, exitPx: 79_900_00000000n, pnl: -100_000_00n, carryPaid: 1n, winFee: 0n, payout: 11_000_000n, premiumReleased: 0n },
  });
  const prints = [
    mockPrint(2, 80_000_00000000n, 80_000_00000000n, 0),
    mockPrint(3, 79_250_00000000n, 79_250_00000000n, 0),
    mockPrint(4, 79_900_00000000n, 79_900_00000000n, 0),
    mockPrint(5, 79_900_00000000n, 79_900_00000000n, 0),
    mockPrint(6, 79_900_00000000n, 79_900_00000000n, 0),
  ];
  const rec = evaluateSurvivalReceipt(p, prints, 1);
  assert.ok(rec !== null);
  assert.equal(rec.closedAfterBreach, true);
  assert.equal(rec.survivedPrints, 3);
});

test("survival receipt: finds the fill in a long print history and ignores prints after the close", () => {
  const fillIdx = 5000;
  const p = mockPosition({
    idxCommit: fillIdx - 2,
    fill: { ...mockPosition().fill, idxFill: fillIdx },
    closed: { tx: "0x3", block: 5100n, idxCloseFill: fillIdx + 3, exitPx: 79_900_00000000n, pnl: -1n, carryPaid: 0n, winFee: 0n, payout: 1n, premiumReleased: 0n },
  });
  const prints = [];
  for (let i = 0; i < fillIdx + 10; i++) prints.push(mockPrint(i, 80_000_00000000n, 80_000_00000000n, 0));
  // An isolated wick at print fill + 1, recovered by the close at fill + 3.
  prints[fillIdx + 1] = mockPrint(fillIdx + 1, 79_200_00000000n, 79_200_00000000n, 0);
  // A breach after the close must not count.
  prints[fillIdx + 6] = mockPrint(fillIdx + 6, 79_000_00000000n, 79_000_00000000n, 0);
  const rec = evaluateSurvivalReceipt(p, prints, 1);
  assert.ok(rec, "the wick between the fill and the close earns a receipt");
  assert.equal(rec.breachPrint.idx, fillIdx + 1);
  assert.equal(rec.closedAfterBreach, true);

  // The same history with only the late breach: nothing happened while the position was open.
  prints[fillIdx + 1] = mockPrint(fillIdx + 1, 80_000_00000000n, 80_000_00000000n, 0);
  assert.equal(evaluateSurvivalReceipt(p, prints, 1), null);
});

test("survival receipt: a position whose fill is newer than every held print has nothing to evaluate", () => {
  const p = mockPosition({ fill: { ...mockPosition().fill, idxFill: 10 } });
  const prints = [mockPrint(7, 80_000_00000000n, 80_000_00000000n), mockPrint(8, 79_000_00000000n, 79_000_00000000n)];
  assert.equal(evaluateSurvivalReceipt(p, prints, 1), null);
});

// ---- APP-4: no receipt for a liquidated position or a wiped-out close ----

const LIQUIDATOR = "0x2222222222222222222222222222222222222222";

test("§1c receipt: mid crosses the level one print BEFORE two consecutive oracle breaches -> liquidated -> NO receipt", () => {
  const p = mockPosition({
    isLong: true,
    liquidated: { tx: "0xliq", block: 106n, idx: 5, oraclePx: 79_200_00000000n, caller: LIQUIDATOR },
  });
  const prints = [
    mockPrint(2, 80_000_00000000n, 80_000_00000000n, 0),
    mockPrint(3, 79_500_00000000n, 79_200_00000000n, 0), // A: oracle above L (79,260), book mid below it
    mockPrint(4, 79_250_00000000n, 79_250_00000000n, 0), // oracle breach 1
    mockPrint(5, 79_200_00000000n, 79_200_00000000n, 0), // oracle breach 2 -> liquidated
  ];
  assert.equal(evaluateSurvivalReceipt(p, prints, 1), null);
});

test("§1c receipt: short side, mid leads the oracle by one print, liquidated at m+2 -> NO receipt", () => {
  const p = mockPosition({
    isLong: false,
    fill: {
      tx: "0x2",
      block: 102n,
      idxFill: 2,
      oraclePx: 80_000_00000000n,
      midPx: 80_000_00000000n,
      basisEwmaE8: 0,
      fillPx: 80_000_00000000n,
      liqPx: 80_740_00000000n,
    },
    liquidated: { tx: "0xliq", block: 106n, idx: 5, oraclePx: 80_800_00000000n, caller: LIQUIDATOR },
  });
  const prints = [
    mockPrint(2, 80_000_00000000n, 80_000_00000000n, 0),
    mockPrint(3, 80_500_00000000n, 80_900_00000000n, 0), // mid above L (80,740), oracle still below it
    mockPrint(4, 80_760_00000000n, 80_760_00000000n, 0), // oracle breach 1
    mockPrint(5, 80_800_00000000n, 80_800_00000000n, 0), // oracle breach 2 -> liquidated
  ];
  assert.equal(evaluateSurvivalReceipt(p, prints, 1), null);
});

test("§1c receipt: closed AT the breach print with nothing left (payout 0) is not 'closed safely' -> NO receipt", () => {
  const p = mockPosition({
    isLong: true,
    closed: {
      tx: "0xc",
      block: 104n,
      idxCloseFill: 3,
      oraclePx: 79_200_00000000n,
      exitPx: 79_100_00000000n,
      pnl: -18_000_000n,
      carryPaid: 0n,
      winFee: 0n,
      payout: 0n,
      premiumReleased: 0n,
    },
  });
  const prints = [mockPrint(2, 80_000_00000000n, 80_000_00000000n, 0), mockPrint(3, 79_200_00000000n, 79_200_00000000n, 0)];
  assert.equal(evaluateSurvivalReceipt(p, prints, 1), null);
});

test("§1c receipt: closed with equity left after a breach still gets the receipt", () => {
  const p = mockPosition({
    isLong: true,
    closed: {
      tx: "0xc",
      block: 105n,
      idxCloseFill: 4,
      oraclePx: 79_800_00000000n,
      exitPx: 79_800_00000000n,
      pnl: -200_000n,
      carryPaid: 0n,
      winFee: 0n,
      payout: 18_000_000n,
      premiumReleased: 0n,
    },
  });
  const prints = [
    mockPrint(2, 80_000_00000000n, 80_000_00000000n, 0),
    mockPrint(3, 79_200_00000000n, 79_200_00000000n, 0),
    mockPrint(4, 79_800_00000000n, 79_800_00000000n, 0),
  ];
  const rec = evaluateSurvivalReceipt(p, prints, 1);
  assert.ok(rec !== null && rec.closedAfterBreach);
  assert.equal(rec.breachPrint.idx, 3);
});

test("§1c receipt: an open position whose next print is an oracle breach has not survived yet", () => {
  const p = mockPosition({ isLong: true });
  const prints = [
    mockPrint(2, 80_000_00000000n, 80_000_00000000n, 0),
    mockPrint(3, 79_500_00000000n, 79_200_00000000n, 0), // mid below L, oracle above
    mockPrint(4, 79_250_00000000n, 79_250_00000000n, 0), // oracle breach 1: the second one would liquidate
  ];
  assert.equal(evaluateSurvivalReceipt(p, prints, 1), null);
  // The next print recovers: the single oracle breach was an isolated wick, so the receipt now fires on it.
  prints.push(mockPrint(5, 79_900_00000000n, 79_900_00000000n, 0));
  const rec = evaluateSurvivalReceipt(p, prints, 1);
  assert.ok(rec !== null);
  assert.equal(rec.breachPrint.idx, 4);
});

// ---- DEL-2: each print is judged against the liquidation level in force at it ----

const withAdd = (extra = {}) =>
  mockPosition({
    isLong: true,
    marginAdds: [{ amount: 80_000_000n, idxEffective: 5, newCollateral: 100_000_000n, newLiqPx: 76_000_00000000n, tx: "0xa", block: 105n }],
    ...extra,
  });

test("levelAt: the fill level before an add's effective print, the new level from it on", () => {
  const p = withAdd();
  assert.equal(levelAt(p, 4), 79_260_00000000n);
  assert.equal(levelAt(p, 5), 76_000_00000000n);
  assert.equal(levelNow(p), 76_000_00000000n);
  assert.equal(levelNow(mockPosition()), 79_260_00000000n);
});

test("DEL-2: a wick before the add keeps its receipt, and the receipt names the level in force then", () => {
  const p = withAdd();
  const prints = [
    mockPrint(2, 80_000_00000000n, 80_000_00000000n, 0),
    mockPrint(3, 79_200_00000000n, 79_200_00000000n, 0), // oracle below the fill level 79,260
    mockPrint(4, 79_900_00000000n, 79_900_00000000n, 0),
    mockPrint(5, 79_900_00000000n, 79_900_00000000n, 0),
  ];
  const rec = evaluateSurvivalReceipt(p, prints, 1);
  assert.ok(rec !== null);
  assert.equal(rec.breachPrint.idx, 3);
  assert.equal(rec.liqPx, 79_260_00000000n);
});

test("DEL-2: the same dip AFTER the add is no wick (the level is now 76,000)", () => {
  const p = withAdd();
  const prints = [
    mockPrint(2, 80_000_00000000n, 80_000_00000000n, 0),
    mockPrint(5, 79_200_00000000n, 79_200_00000000n, 0), // 79,200 is below the old level but above the new one
    mockPrint(6, 79_900_00000000n, 79_900_00000000n, 0),
  ];
  assert.equal(evaluateSurvivalReceipt(p, prints, 1), null);
});

test("MMN-3 (ab42 gap): a pair of consecutive oracle breaches followed by a recovery is still liquidatable, so NO receipt", () => {
  const p = mockPosition({ isLong: true });
  const prints = [
    mockPrint(2, 80_000_00000000n, 80_000_00000000n, 0),
    mockPrint(3, 79_250_00000000n, 79_250_00000000n, 0), // oracle beyond 79,260
    mockPrint(4, 79_240_00000000n, 79_240_00000000n, 0), // oracle beyond again: the pair
    mockPrint(5, 79_900_00000000n, 79_900_00000000n, 0), // recovery; nobody has settled yet
    mockPrint(6, 79_900_00000000n, 79_900_00000000n, 0),
  ];
  assert.equal(evaluateSurvivalReceipt(p, prints, 1), null, "the next settle liquidates on prints 3 and 4");
});

test("MMN-3 (ab42 gap): a close that pays out, filled AT the breach print, is an exit and not a survival", () => {
  const p = mockPosition({
    isLong: true,
    closed: { tx: "0xclose", block: 104n, idxCloseFill: 3, oraclePx: 79_500_00000000n, exitPx: 79_500_00000000n, pnl: -100_000_00n, carryPaid: 1n, winFee: 0n, payout: 11_000_000n, premiumReleased: 0n },
  });
  const prints = [
    mockPrint(2, 80_000_00000000n, 80_000_00000000n, 0),
    mockPrint(3, 79_200_00000000n, 79_200_00000000n, 0), // the oracle dips through the level at the close's own fill print
  ];
  assert.equal(evaluateSurvivalReceipt(p, prints, 1), null, "no print was survived after the breach print");
});

// ---- S3: a push moves the book mid, not the oracle; liquidation reads oraclePx only, so a pushed mid earns no receipt ----

test("S3: a pushed book mid far past the level with a flat oracle produces NO receipt (long and short)", () => {
  const flat = 80_000_00000000n;
  // A long (level 79,260): the mid is pushed 150 bp down for five prints, then released. The oracle never moves.
  const longPrints = [mockPrint(2, flat, flat, 0)];
  for (let i = 3; i <= 7; i++) longPrints.push(mockPrint(i, flat, 78_800_00000000n, 0));
  for (let i = 8; i <= 10; i++) longPrints.push(mockPrint(i, flat, flat, 0));
  assert.equal(evaluateSurvivalReceipt(mockPosition({ isLong: true }), longPrints, 1), null);
  assert.equal(evaluateSurvivalReceipt(mockPosition({ isLong: true }), longPrints, 3), null);

  // A short (level 80,740): the mid is pushed 150 bp up, with the trailing basis at 0 and then at a drifted +0.6 bp.
  const short = mockPosition({ isLong: false, fill: { ...mockPosition().fill, liqPx: 80_740_00000000n } });
  for (const ewma of [0, 6_000]) {
    const prints = [mockPrint(2, flat, flat, 0)];
    for (let i = 3; i <= 7; i++) prints.push(mockPrint(i, flat, 81_200_00000000n, ewma));
    prints.push(mockPrint(8, flat, flat, ewma));
    assert.equal(evaluateSurvivalReceipt(short, prints, 1), null, `ewma ${ewma}`);
  }

  // The same position with one oracle print at the level does get one: the oracle, not the mid, decides.
  const real = [...longPrints];
  real[3] = mockPrint(5, 79_260_00000000n, 78_800_00000000n, 0); // exactly at the level counts, as in the contract
  const rec = evaluateSurvivalReceipt(mockPosition({ isLong: true }), real, 1);
  assert.ok(rec !== null);
  assert.equal(rec.breachPrint.idx, 5);
  assert.equal(rec.beyondBp, 0);
});
