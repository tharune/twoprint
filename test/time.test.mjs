import test from "node:test";
import assert from "node:assert/strict";
import { axisTime, fullTime, fullTimeSeconds, localZone } from "../src/lib/time.js";

// Chart times are in the reader's own zone: the clock for a day or so, the date for longer.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

test("a span of a day or so is labelled with the clock, and midnight is 00, never 24", () => {
  const t = new Date(2026, 9, 19, 0, 5).getTime();
  assert.match(axisTime(t, HOUR), /^\d{2}:\d{2}$/);
  assert.equal(axisTime(t, DAY), "00:05");
  assert.equal(axisTime(new Date(2026, 9, 19, 17, 42).getTime(), DAY), "17:42");
});

test("a longer span is labelled with the date, and the longest with the month and year", () => {
  const t = new Date(2026, 9, 19, 17, 42).getTime();
  assert.doesNotMatch(axisTime(t, 7 * DAY), /^\d{2}:\d{2}$/);
  assert.match(axisTime(t, 7 * DAY), /19/);
  assert.match(axisTime(t, 400 * DAY), /2026/);
  assert.doesNotMatch(axisTime(t, 400 * DAY), /19/);
});

test("a tooltip time carries the date and the clock, and the zone is a name the embed can use", () => {
  const t = new Date(2026, 9, 19, 17, 42).getTime();
  assert.match(fullTime(t), /17:42/);
  assert.match(fullTime(t), /19/);
  assert.ok(localZone().length > 0);
});

test("the oracle's updates are told to the second, because they come a few seconds apart", () => {
  const t = new Date(2026, 9, 19, 17, 42, 31).getTime();
  assert.match(fullTimeSeconds(t), /17:42:31/);
  assert.match(fullTimeSeconds(new Date(2026, 9, 19, 0, 5, 9).getTime()), /00:05:09/);
});
