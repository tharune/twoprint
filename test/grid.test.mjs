import test from "node:test";
import assert from "node:assert/strict";
import { HOUR, MINUTE, bucketEvents, bucketSize, sampleSteps, sequence, windowFor } from "../src/lib/grid.js";

// A chart of events puts a running total and bars on an even grid. None of it may invent a value.

test("a window opens before the first event and ends now, and is never narrower than asked", () => {
  const now = 10 * HOUR;
  const w = windowFor(now - 10 * MINUTE, now);
  assert.equal(now - w.from, 2 * HOUR); // the minimum
  assert.ok(w.to > now);
  const long = windowFor(now - 8 * HOUR, now);
  assert.equal(now - long.from, 10 * HOUR); // eight hours of events, a quarter more of room
});

test("a bucket spreads a span over about forty-eight bars, rounded to a clock-friendly size", () => {
  assert.equal(bucketSize(30 * MINUTE), MINUTE);
  assert.equal(bucketSize(4 * HOUR), 5 * MINUTE);
  assert.equal(bucketSize(24 * HOUR), 30 * MINUTE);
  assert.ok(bucketSize(1000 * HOUR) >= 24 * HOUR);
});

test("a running total carries its value forward between changes and starts from nothing", () => {
  const steps = [
    { t: 25 * MINUTE, v: 5 },
    { t: 47 * MINUTE, v: 3 },
  ];
  const grid = sampleSteps(steps, 0, 60 * MINUTE, 10 * MINUTE);
  assert.deepEqual(
    grid.map((g) => g.v),
    [0, 0, 0, 5, 5, 3, 3],
  );
  assert.equal(grid[0].t, 0);
  assert.ok(grid[grid.length - 1].t >= 60 * MINUTE); // the newest value reaches the edge
  assert.deepEqual(sampleSteps([], 0, 20 * MINUTE, 10 * MINUTE, 7).map((g) => g.v), [7, 7, 7]);
});

test("events are summed into their bucket and an empty bucket is zero", () => {
  const out = bucketEvents(
    [
      { t: 1 * MINUTE, v: 2 },
      { t: 4 * MINUTE, v: 3 },
      { t: 21 * MINUTE, v: -1 },
      { t: 99 * HOUR, v: 50 }, // outside the grid
    ],
    0,
    30 * MINUTE,
    10 * MINUTE,
  );
  assert.deepEqual(
    out.map((b) => [b.v, b.n]),
    [
      [5, 2],
      [0, 0],
      [-1, 1],
      [0, 0],
    ],
  );
});

test("things in a sequence get even stand-in moments and keep their names", () => {
  const s = sequence(["#3", "#4", "#7"]);
  assert.equal(s.times.length, 3);
  // a calendar year apart, so the axis gives every one the same weight
  assert.deepEqual(s.times.map((t) => new Date(t * 1000).toISOString().slice(0, 10)), ["2000-01-01", "2001-01-01", "2002-01-01"]);
  assert.deepEqual(s.times.map(s.index), [0, 1, 2]);
  assert.deepEqual(s.times.map(s.name), ["#3", "#4", "#7"]);
  assert.equal(s.name(12345), "");
});
