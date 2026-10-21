import test from "node:test";
import assert from "node:assert/strict";
import { stepGeometry, seeded, walk } from "../src/lib/steps.js";

test("a step line holds each price until the next print and turns a corner there", () => {
  const g = stepGeometry([10, 12, 11, 15], 100, 40, { left: 3, right: 3, top: 3, bottom: 3 });
  assert.match(g.d, /^M3\.0 /);
  assert.equal((g.d.match(/H/g) ?? []).length, 3);
  assert.equal((g.d.match(/V/g) ?? []).length, 3);
  assert.equal(g.x(0), 3);
  assert.equal(g.x(3), 97);
  assert.equal(g.y(15), 3, "the highest value touches the top inset");
  assert.equal(g.y(10), 37, "the lowest touches the bottom inset");
});

test("the fill under the line is the line closed down to the bottom of the plot", () => {
  const g = stepGeometry([1, 2, 3], 60, 30, { bottom: 5 });
  assert.ok(g.area.startsWith(g.d));
  assert.ok(g.area.endsWith("Z"));
  assert.ok(g.area.includes("V25.0H0.0Z"), "closes at the plot bottom, 5 above the edge");
});

test("a fixed range places values on it whatever the series holds", () => {
  const g = stepGeometry([5, 6], 100, 100, { lo: 0, hi: 10 });
  assert.equal(g.y(5), 50);
  assert.equal(g.y(0), 100);
  assert.equal(g.y(10), 0);
});

test("a flat series sits at mid height, and fewer than two values draw nothing", () => {
  const g = stepGeometry([7, 7, 7], 100, 40);
  assert.equal(g.y(7), 20);
  assert.equal(stepGeometry([7], 100, 40), null);
  assert.equal(stepGeometry([], 100, 40), null);
});

test("the same seed gives the same walk, and a different seed a different one", () => {
  assert.deepEqual(walk(40, 11, 2), walk(40, 11, 2));
  assert.notDeepEqual(walk(40, 11, 2), walk(40, 12, 2));
  assert.equal(walk(40, 11, 2).length, 40);
  assert.equal(walk(5, 1)[0], 0);
  const r = seeded(3);
  const draws = Array.from({ length: 200 }, r);
  assert.ok(draws.every((v) => v >= 0 && v < 1));
});
