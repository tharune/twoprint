import test from "node:test";
import assert from "node:assert/strict";
import { M1_ROUND_TRIP_BP, PAPERTRADE, compare, papertrade, papertradeScale, pushAt, pushTape, twoprint, twoprintParams, worseOfBp } from "../src/lib/compare.ts";

// Display comparison examples: kept PnL, % of margin, long winner, 1 h hold,
// live Config (2% win fee, 0.25 bp/h carry), mean round-trip fill cost. Values are rounded to 2 dp in the examples.
const M1 = [
  // move %, lev, PT BTC, PT ETH, TP BTC, TP ETH
  [0.05, 100, 3.04, 2.7, 4.22, 4.07],
  [0.1, 10, 0.72, 0.68, 0.91, 0.9],
  [0.1, 50, 3.62, 3.38, 4.56, 4.49],
  [0.1, 100, 7.24, 6.76, 9.12, 8.97],
  [0.25, 100, 20.32, 19.7, 23.82, 23.67],
  [0.5, 100, 42.31, 41.64, 48.32, 48.17],
  [1, 10, 8.64, 8.57, 9.73, 9.72],
  [1, 100, 86.38, 85.68, 97.32, 97.17],
  [2, 100, 174.57, 173.85, 195.32, 195.17],
];

const CFG = twoprintParams(null); // Config.sol fallbacks: what M1 calls the live Config for fees and carry
const trade = (market, movePct, leverage, collateral = 100) => ({ market, isLong: true, leverage, collateral, movePct, holdHours: 1, entryPx: 100_000 });
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: got ${a.toFixed(4)}, want ${b}`);

test("M1 headline: 100x BTC, 0.1% -> Papertrade 7.24% / Twoprint ~9.12%; 1% -> 86.38% / 97.32%", () => {
  const a = compare(trade(0, 0.1, 100), CFG);
  near(a.papertrade.keptPct, 7.24, 0.005, "PT 0.1%");
  near(a.twoprint.keptPct, 9.12, 0.005, "TP 0.1%");
  const b = compare(trade(0, 1, 100), CFG);
  near(b.papertrade.keptPct, 86.38, 0.005, "PT 1%");
  near(b.twoprint.keptPct, 97.32, 0.005, "TP 1%");
});

test("every M1 cell we carry reproduces to the report's rounding, for both coins", () => {
  for (const [move, lev, ptB, ptE, tpB, tpE] of M1) {
    for (const [mkt, pt, tp] of [[0, ptB, tpB], [1, ptE, tpE]]) {
      const r = compare(trade(mkt, move, lev), CFG);
      near(r.papertrade.keptPct, pt, 0.0051, `PT m${mkt} ${move}% ${lev}x`);
      near(r.twoprint.keptPct, tp, 0.0051, `TP m${mkt} ${move}% ${lev}x`);
    }
  }
});

test("% of margin is the same at $10, $100 and $1,000 of margin (M1: identical at $1k/$10k/$100k notional)", () => {
  const pcts = [10, 100, 1000].map((c) => compare(trade(0, 0.1, 100, c), CFG));
  for (const r of pcts) {
    near(r.papertrade.keptPct, pcts[0].papertrade.keptPct, 1e-9, "PT");
    near(r.twoprint.keptPct, pcts[0].twoprint.keptPct, 1e-9, "TP");
  }
  near(pcts[2].papertrade.kept, 72.43, 0.005, "PT $ at $100k notional");
  near(pcts[2].twoprint.kept, 91.16, 0.005, "TP $ at $100k notional");
});

test("Papertrade's docs examples: BTC keeps ~88.1% of a 1% move and ~73.9% of a 0.1% move (of raw, before the 2% fee)", () => {
  const keep = (m) => ((m - 1 / PAPERTRADE.deadbandDivisor) * papertradeScale(m - 1 / PAPERTRADE.deadbandDivisor, 0)) / m;
  near(keep(0.01) * 100, 88.1, 0.05, "1%");
  near(keep(0.001) * 100, 73.9, 0.05, "0.1%");
  assert.ok(papertradeScale(10, 0) <= 0.9 && papertradeScale(10, 0) > 0.899, "the 90% cap is the limit");
  assert.equal(papertrade(trade(0, 0.0015, 100)).kept, 0, "a win inside the 0.2 bp deadband pays 0");
});

test("liquidation at 100x: Papertrade busts at 0.95% and takes the whole margin; Twoprint's M3 level is ~88.4 bp out", () => {
  const pt = papertrade(trade(0, -0.95, 100));
  near(pt.liqDistance * 100, 0.95, 1e-9, "PT bust distance");
  assert.equal(pt.liquidated, true);
  assert.equal(pt.keptPct, -100);
  assert.equal(papertrade(trade(0, -0.94, 100)).liquidated, false);
  near(pt.liqPx, 99_050, 1e-6, "docs: a 100x long at $100 busts at about $99.05");

  const tp = twoprint(trade(0, -0.5, 100), CFG);
  near(tp.liqDistance * 1e4, 88.4, 1e-9, "TP level, 11.6 bp premium (floor binds)");
  assert.equal(tp.liquidated, false);
  assert.equal(twoprint(trade(0, -0.9, 100), CFG).liquidated, true);
  assert.equal(twoprint(trade(0, -0.9, 100), CFG).keptPct, -100);
});

test("Twoprint reads the chain's parameters when it has them, and refuses what the contract refuses", () => {
  const live = twoprintParams({ winFeeBps: 300, carryPerHourE8: 5_000, premiumMultE4: 15_600, sigmaFloorE8: 10_000, maxFillAdjE8: 150_000, maxLevDefault: 50, maxLevVerified: 100 }, 15_000n);
  assert.equal(live.maxLeverage, 100);
  assert.equal(live.sigmaE8, 15_000);
  const r = twoprint(trade(0, 0.1, 100), live);
  // (10 − 0.443) × 0.97 − 0.5 at c = 1.56, σ̂ 1.5 bp; the premium is refunded on a winner
  near(r.keptPct, (10 - 0.443) * 0.97 - 0.5, 1e-9, "custom params");
  near(r.liqDistance * 1e4, 100 - 1.56 * 1.5, 1e-9, "level at c·σ̂");
  assert.equal(twoprint(trade(0, 0.1, 200), live).available, false, "above the live cap");
  assert.equal(papertrade(trade(0, 0.1, 1000)).available, true);
  assert.equal(papertrade(trade(0, 0.1, 1001)).available, false);
  // σ̂ so high the premium eats the margin: MarginTooThin
  assert.equal(twoprint(trade(1, 0.1, 100), twoprintParams(null, 300_000)).available, false);
});

test("losers: Papertrade takes no fee from the trader; Twoprint adds the fill cost and carry stops at zero equity", () => {
  const pt = papertrade(trade(0, -0.5, 100));
  near(pt.keptPct, -50, 1e-9, "PT loss");
  assert.ok(pt.fees.every((f) => f.amount === 0));
  const tp = twoprint({ ...trade(0, -0.5, 100), holdHours: 1 }, CFG);
  near(tp.keptPct, -(50 + 0.443) - 0.25, 1e-9, "TP loss");
  const short = twoprint({ ...trade(0, -0.5, 100), isLong: false }, CFG);
  assert.ok(short.keptPct > 0, "a short wins on a fall");
  const carryAll = twoprint({ ...trade(0, -0.8, 100), holdHours: 1000 }, CFG);
  assert.ok(carryAll.kept >= -100 && carryAll.kept <= -80);
});

// ---- S2: the synthetic push (M2 §2.1: +12 bp for 60 s, oracle holds)

test("push tape: a 12 bp mid push for 60 s with a flat oracle never fills anyone better than the oracle", () => {
  assert.equal(pushAt(-1), 0);
  assert.equal(pushAt(30), 12);
  assert.equal(pushAt(70), 0);
  const tape = pushTape(Array.from({ length: 121 }, (_, i) => i - 20));
  for (const s of tape) {
    assert.ok(s.buyFill >= s.oracle, `buy at t=${s.t}`);
    assert.ok(s.sellFill <= s.oracle, `sell at t=${s.t}`);
    assert.ok(s.buyFill - s.oracle <= 15 && s.oracle - s.sellFill <= 15, "15 bp clamp");
  }
  const peak = tape.find((s) => s.t === 10);
  assert.equal(peak.sellFill, 0, "the attacker's close into the push fills at the oracle");
  assert.equal(peak.midFill, 12, "a mid fill hands the attacker the push");
  const during = tape.find((s) => s.t === 30);
  near(during.buyFill, 11.7, 0.05, "another trader's buy during the push pays ~push − EWMA drag (M2 mean 11.6 bp)");
  assert.equal(worseOfBp(0, 50, true), 15, "a bigger push is capped at 15 bp");
});

test("M1 constants are the report's", () => {
  assert.deepEqual([...M1_ROUND_TRIP_BP], [0.443, 0.589]);
});

test("twoprint: a loser near the level keeps its premium back, and carry comes only from margin + pnl (PositionManager._closeMath)", () => {
  const r = twoprint({ ...trade(0, -0.8, 100), holdHours: 1000 }, CFG);
  assert.equal(r.liquidated, false);
  near(r.kept, -88.4, 0.05, "premium refunded, carry capped at margin + pnl");
});

test("twoprint: above the live max position notional is unavailable", () => {
  assert.equal(twoprint({ ...trade(0, 0.1, 100), collateral: 3000 }, CFG).available, false);
  assert.equal(twoprint({ ...trade(0, 0.1, 100), collateral: 3000 }, twoprintParams({ maxPositionNotional: 500_000n * 10n ** 6n })).available, true);
});
