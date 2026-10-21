import test from "node:test";
import assert from "node:assert/strict";
import { cumulative } from "../src/lib/book.js";

// The Advanced depth chart draws how much is on each side of the book, a running total outward from the best price.

test("depth is a running total from the best price outward", () => {
  const side = [
    { px: 100, sz: 2 },
    { px: 99.5, sz: 1.5 },
    { px: 99, sz: 0.5 },
  ];
  assert.deepEqual(cumulative(side), [
    { px: 100, total: 2 },
    { px: 99.5, total: 3.5 },
    { px: 99, total: 4 },
  ]);
  assert.deepEqual(cumulative([]), []);
});
