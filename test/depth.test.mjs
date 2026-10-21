import test from "node:test";
import assert from "node:assert/strict";
import { DEPTH_MARGIN, depthAt, depthGeometry, oracleMarker } from "../src/lib/depth.js";

// Numerical unit inputs exercise depth geometry; these are not chain or venue fixtures.
const book = {
  bids: [{ px: 99, sz: 2 }, { px: 97, sz: 3 }],
  asks: [{ px: 101, sz: 4 }, { px: 104, sz: 6 }],
  time: 1,
};
const geometry = () => depthGeometry(book, 640, 360);
const f = (n) => n.toFixed(1);

test("depth steps add size at its own price on both sides", () => {
  const g = geometry();
  assert.equal(g.bidLine, `M${f(g.x(99))} ${f(g.y(0))}V${f(g.y(2))}H${f(g.x(97))}V${f(g.y(5))}`);
  assert.equal(g.askLine, `M${f(g.x(101))} ${f(g.y(0))}V${f(g.y(4))}H${f(g.x(104))}V${f(g.y(10))}`);
  assert.equal(g.bidArea, `${g.bidLine}V${f(g.y(0))}Z`);
  assert.equal(g.askArea, `${g.askLine}V${f(g.y(0))}Z`);
});

test("hover totals agree with price thresholds including both edges of the spread", () => {
  const g = geometry();
  for (const [price, side, total] of [[99, "bid", 2], [98, "bid", 2], [97, "bid", 5], [99.5, "bid", 0], [100, "bid", 0], [100.5, "ask", 0], [101, "ask", 4], [103, "ask", 4], [104, "ask", 10]]) {
    assert.deepEqual(depthAt(g, price), { side, total }, `price ${price}`);
  }
});

test("distant oracle stays at its indicated edge without expanding book coverage", () => {
  const g = geometry();
  assert.deepEqual({ lo: g.lo, hi: g.hi }, { lo: 97, hi: 104 });
  assert.deepEqual(oracleMarker(g, 150), { x: DEPTH_MARGIN.left + g.w, position: "above" });
  assert.deepEqual(oracleMarker(g, 50), { x: DEPTH_MARGIN.left, position: "below" });
  assert.deepEqual({ lo: g.lo, hi: g.hi }, { lo: 97, hi: 104 });
});

test("oracle inside the book uses its actual price coordinate", () => {
  const g = geometry();
  for (const price of [97, 100, 104]) assert.deepEqual(oracleMarker(g, price), { x: g.x(price), position: "inside" });
});

test("single price and zero size have finite usable geometry", () => {
  const g = depthGeometry({ bids: [{ px: 100, sz: 0 }], asks: [{ px: 100, sz: 0 }], time: 1 }, 640, 360);
  for (const n of [g.x(100), g.y(0), g.pad, g.top, g.w, g.h]) assert.ok(Number.isFinite(n));
  assert.ok(g.pad > 0);
  assert.ok(g.top > 0);
  assert.ok(g.w > 0);
  assert.ok(g.h > 0);
  assert.doesNotMatch(g.bidLine + g.askLine + g.bidArea + g.askArea, /NaN|Infinity/);
});

test("a one-level book preserves its actual price and quantity", () => {
  const g = depthGeometry({ bids: [{ px: 0.00001, sz: 2 }], asks: [{ px: 0.00002, sz: 3 }], time: 1 }, 640, 360);
  assert.deepEqual(g.bids, [{ px: 0.00001, total: 2 }]);
  assert.deepEqual(g.asks, [{ px: 0.00002, total: 3 }]);
  assert.equal(g.lo, 0.00001);
  assert.equal(g.hi, 0.00002);
  assert.ok(g.x(g.bestBid) < g.x(g.bestAsk));
  assert.doesNotMatch(g.bidLine + g.askLine, /NaN|Infinity/);
});

test("empty sides cannot produce a depth chart", () => {
  assert.equal(depthGeometry(undefined, 640, 360), null);
  assert.equal(depthGeometry({ ...book, bids: [] }, 640, 360), null);
  assert.equal(depthGeometry({ ...book, asks: [] }, 640, 360), null);
});

test("narrow plots use fewer price labels", () => {
  const narrow = depthGeometry(book, 254, 280);
  const wide = depthGeometry(book, 838, 436);
  assert.ok(narrow.xs.ticks.length <= 3);
  assert.ok(narrow.xs.ticks.length < wide.xs.ticks.length);
});

test("small or nonfinite dimensions cannot turn geometry negative or nonfinite", () => {
  for (const [width, height] of [[0, 0], [10, 20], [NaN, Infinity]]) {
    const g = depthGeometry(book, width, height);
    assert.ok(Number.isFinite(g.w) && g.w > 0);
    assert.ok(Number.isFinite(g.h) && g.h > 0);
    assert.ok(Number.isFinite(g.x(g.mid)));
    assert.ok(Number.isFinite(g.y(1)));
  }
});
