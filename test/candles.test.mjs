import test from "node:test";
import assert from "node:assert/strict";
import { CANDLE_MS, INTERVALS, INTERVAL_IDS, MAX_CANDLES, RANGES, candlePoints, fromRaw, loadMs, mergeCandle } from "../src/lib/candles.js";

// The Basic price chart draws a venue's closing prices over the span you pick.

const DAY = 86_400_000;

test("a timeframe drawn from the venue gets a candle size that leaves a few hundred points, and never asks for more than the venue returns", () => {
  const venue = RANGES.filter((r) => r.source === "venue" && r.ms > 0);
  assert.ok(venue.length >= 6, "the longer timeframes come from the venue");
  for (const r of venue) {
    const shown = r.ms / CANDLE_MS[r.size];
    assert.ok(shown >= 60 && shown <= 400, `${r.id} draws ${shown} points`);
    const loaded = loadMs(r) / CANDLE_MS[r.size];
    assert.ok(loaded >= shown && loaded <= MAX_CANDLES, `${r.id} loads ${loaded} candles`);
  }
});

test("the shortest timeframes come from the oracle's own updates, about three seconds apart, and load history behind the span", () => {
  const oracle = RANGES.filter((r) => r.source === "oracle");
  assert.deepEqual(oracle.map((r) => r.label), ["1m", "5m", "15m"]);
  for (const r of oracle) {
    const steps = r.ms / 3000;
    assert.ok(steps >= 20 && steps <= 300, `${r.id} draws ${steps} steps`);
    assert.ok(r.reach >= 3, `${r.id} loads history behind the span`);
  }
});

test("the timeframes run from shortest to longest, each with a name a screen reader can say, and All loads everything", () => {
  assert.deepEqual(RANGES.map((r) => r.label), ["1m", "5m", "15m", "1H", "4H", "1D", "1W", "1M", "1Y", "All"]);
  const spans = RANGES.filter((r) => r.ms > 0).map((r) => r.ms);
  assert.deepEqual(spans, [...spans].sort((a, b) => a - b));
  assert.equal(new Set(RANGES.map((r) => r.id)).size, RANGES.length);
  assert.equal(RANGES.find((r) => r.label === "1m").name, "1 minute");
  assert.equal(RANGES.find((r) => r.label === "1M").name, "1 month");
  const all = RANGES.find((r) => r.id === "all");
  assert.equal(all.ms, 0);
  assert.equal(loadMs(all), 0);
  assert.equal(loadMs(RANGES.find((r) => r.id === "1y")), 2 * 365 * DAY);
});

test("a close is drawn when its candle closed, on the second, and the candle still open is drawn at now", () => {
  const now = 1_000_000;
  const pts = candlePoints(
    [
      { t: 0, T: 399_999, c: 100 },
      { t: 400_000, T: 799_999, c: 101 },
      { t: 800_000, T: 1_199_999, c: 102 },
    ],
    now,
  );
  // the venue ends a candle a millisecond before the next begins; the point sits on the boundary
  assert.deepEqual(pts, [
    { t: 400_000, v: 100 },
    { t: 800_000, v: 101 },
    { t: now, v: 102 },
  ]);
  assert.deepEqual(candlePoints([], now), []);
});

test("a live candle replaces the newest one when it is the same candle, and follows it when it is the next", () => {
  const c = (t, close) => ({ t, T: t + 299_999, o: 1, h: 2, l: 0.5, c: close, v: 1 });
  const history = [c(0, 1.1), c(300_000, 1.2)];
  assert.deepEqual(mergeCandle(history, c(300_000, 1.5)).map((x) => x.c), [1.1, 1.5]); // the open candle moved
  assert.deepEqual(mergeCandle(history, c(600_000, 1.3)).map((x) => x.t), [0, 300_000, 600_000]); // a new candle began
  assert.deepEqual(mergeCandle(history, c(0, 9)).map((x) => x.c), [1.1, 1.2]); // an old candle changes nothing
  assert.deepEqual(mergeCandle([], c(0, 1)).length, 1);
  assert.equal(history.length, 2); // the history it was given is left alone
});

test("a candle from the feed is read into numbers", () => {
  const raw = { t: 1, T: 2, o: "81000.5", h: "81100", l: "80900.25", c: "81050", v: "12.5" };
  assert.deepEqual(fromRaw(raw), { t: 1, T: 2, o: 81000.5, h: 81100, l: 80900.25, c: 81050, v: 12.5 });
});

test("every candle size has history to show and a size in milliseconds that matches its name", () => {
  assert.deepEqual(INTERVAL_IDS, ["1m", "5m", "15m", "1h", "4h", "1d"]);
  for (const i of INTERVALS) assert.ok(i.bars >= 300 && i.bars <= 1000, i.id);
  assert.equal(INTERVALS.find((i) => i.id === "1h").ms, 3_600_000);
});
