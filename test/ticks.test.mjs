import test from "node:test";
import assert from "node:assert/strict";
import { niceStep, niceTicks, stepDecimals, tickLabel } from "../src/lib/ticks.js";

// The chart axes label round values (81,700, 81,725, ...), never the odd quarter points of a range.

test("the step is 1, 2, 2.5 or 5 times a power of ten, a little finer than the even split rather than coarser", () => {
  assert.equal(niceStep(150, 6), 25); // raw 25: exactly six ticks
  assert.equal(niceStep(2057, 6), 250); // raw 343: 250 fits under 429, 500 does not
  assert.equal(niceStep(1840, 5), 250); // raw 368
  assert.equal(niceStep(2000, 5), 500); // raw 400: 500 fits under 500
  assert.equal(niceStep(165, 5), 25); // raw 33
  assert.equal(niceStep(0.9, 5), 0.2);
  assert.equal(niceStep(0, 5), 1); // degenerate input stays finite
  // never more than twice as many ticks as asked for, never fewer than four fifths as many
  for (const span of [7, 33, 150, 410, 2057, 81_000]) for (const target of [3, 4, 5, 6, 8]) {
    const n = span / niceStep(span, target);
    assert.ok(n >= target * 0.8 - 1e-9 && n <= target * 2.5 + 1e-9, `${span}/${target} gave ${n}`);
  }
});

test("ticks are multiples of the step, inside the range, and exact after float rounding", () => {
  const { ticks, step } = niceTicks(81_680.3, 81_829.7, 6);
  assert.equal(step, 25);
  assert.deepEqual(ticks, [81_700, 81_725, 81_750, 81_775, 81_800, 81_825]);
  assert.deepEqual(niceTicks(81_680, 81_780, 6).ticks, [81_680, 81_700, 81_720, 81_740, 81_760, 81_780]);
  assert.deepEqual(niceTicks(-150, 15, 5).ticks, [-150, -125, -100, -75, -50, -25, 0]);
  assert.deepEqual(niceTicks(2_388.1, 2_388.9, 4).ticks, [2_388.25, 2_388.5, 2_388.75]); // sub-unit steps carry no float noise
});

test("a flat or invalid range gives at most one tick, never a loop", () => {
  assert.deepEqual(niceTicks(5, 5, 5).ticks, [5]);
  assert.deepEqual(niceTicks(9, 3, 5).ticks, []);
  assert.deepEqual(niceTicks(NaN, 3, 5).ticks, []);
});

test("step decimals and labels", () => {
  assert.equal(stepDecimals(20), 0);
  assert.equal(stepDecimals(0.25), 2);
  assert.equal(stepDecimals(0.2), 1);
  assert.equal(tickLabel(81_720, 0), "81,720");
  assert.equal(tickLabel(2_388.4, 1), "2,388.4");
  assert.equal(tickLabel(-100, 0), "−100");
  assert.equal(tickLabel(-0.00001, 0), "0"); // no "−0"
});
