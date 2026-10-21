import test from "node:test";
import assert from "node:assert/strict";
import { examplePosition, premiumParams, premiumRate } from "../src/lib/premium.js";

// The landing page's example order (20 tUSDC, BTC) must match what the chain quotes at Config's parameters.

test("S4 parameters: the 4 bp floor binds, so 100x reserves 2.32 tUSDC and the level sits 0.884% away", () => {
  const { multE4, floorE8 } = premiumParams(null);
  assert.equal(premiumRate(multE4, floorE8), 2.9 * 4e-4); // 11.6 bp of notional
  const p = examplePosition(20, 100, premiumRate(multE4, floorE8));
  assert.ok(Math.abs(p.premium - 2.32) < 1e-9);
  assert.ok(Math.abs(p.distance - 0.00884) < 1e-9);
});

test("above the floor the premium scales with sigma, and the chain's parameters win once read", () => {
  assert.ok(Math.abs(premiumRate(29_000, 40_000, 100_000) - 2.9 * 1e-3) < 1e-12);
  assert.deepEqual(premiumParams({ premiumMultE4: 30_200, sigmaFloorE8: 10_000 }), { multE4: 30_200, floorE8: 10_000 });
  const g2 = examplePosition(20, 100, premiumRate(30_200, 10_000)); // 3.02 x 1.5 bp
  assert.ok(Math.abs(g2.premium - 0.906) < 1e-9);
});
