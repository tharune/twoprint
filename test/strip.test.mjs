import test from "node:test";
import assert from "node:assert/strict";
import { STRIP_PRINTS, stripScenarios } from "../src/lib/strip.js";
import { EXAMPLE_COLLATERAL, examplePosition, premiumParams, premiumRate } from "../src/lib/premium.js";

// The landing's liquidation picture is an illustration, but the rule it plays out is the protocol's: one price update past the
// level costs the premium, and a second in a row liquidates. The walks are scripted, so these checks keep a change to the
// numbers from teaching the wrong rule.

const PARAMS = {
  "S4 parameters (the repo's Config)": null,
  "v1 deployment (1.56 sigma)": { premiumMultE4: 15_600, sigmaFloorE8: 15_000 },
};

function build(pm) {
  const { multE4, floorE8 } = premiumParams(pm);
  const ex = examplePosition(EXAMPLE_COLLATERAL, 100, premiumRate(multE4, floorE8));
  const levelBp = ex.distance * 1e4;
  const list = stripScenarios({ levelBp });
  return { levelBp, ex, list, get: (id) => list.find((s) => s.id === id) };
}

for (const [name, pm] of Object.entries(PARAMS)) {
  test(`${name}: both walks have the shared length and marks inside it`, () => {
    const { list } = build(pm);
    assert.deepEqual(list.map((s) => s.id), ["wick", "two"]);
    for (const s of list) {
      assert.equal(s.prints.length, STRIP_PRINTS, s.id);
      assert.ok(s.prints.every(Number.isFinite), s.id);
      assert.ok(s.marks.every((m) => m.idx >= 0 && m.idx < STRIP_PRINTS), s.id);
    }
  });

  test(`${name}: one update beyond the level is exactly one update, and the next is back inside`, () => {
    const { levelBp, get } = build(pm);
    const s = get("wick");
    const beyond = s.prints.map((p, i) => (p < -levelBp ? i : -1)).filter((i) => i >= 0);
    assert.deepEqual(beyond, [s.marks[0].idx]);
    assert.ok(s.prints[s.marks[0].idx + 1] > -levelBp, "the update after it is inside the level");
  });

  test(`${name}: two in a row is two consecutive updates beyond the level, the second one liquidates`, () => {
    const { levelBp, get } = build(pm);
    const s = get("two");
    const beyond = s.prints.map((p, i) => (p < -levelBp ? i : -1)).filter((i) => i >= 0);
    const [first, second] = s.marks;
    assert.equal(beyond[0], first.idx, "nothing crosses before the first marked update");
    assert.equal(beyond[1], second.idx, "the next update crosses too");
    assert.equal(second.idx, first.idx + 1);
    assert.equal(second.label, "Liquidated");
  });

  test(`${name}: the quiet stretch before an event stays well clear of the level`, () => {
    const { levelBp, list } = build(pm);
    for (const s of list) {
      const event = Math.min(...s.marks.map((m) => m.idx));
      const quiet = s.prints.slice(0, event - 1); // up to the update before the first move
      assert.ok(Math.min(...quiet) >= -0.4 * levelBp - 1e-9, `${s.id} wanders no further than 40% of the way to the level`);
    }
  });
}

test("the level follows the premium it is given", () => {
  const v1 = build(PARAMS["v1 deployment (1.56 sigma)"]);
  assert.ok(v1.levelBp > build(null).levelBp, "a smaller premium leaves the level further from the entry");
});

test("the walks are the same on every build", () => {
  assert.deepEqual(build(null).list, build(null).list);
});
