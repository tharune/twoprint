import test from "node:test";
import assert from "node:assert/strict";
import { marksFor } from "../src/lib/marks.js";

const base = { id: 1n, market: 0, isLong: true, idxCommit: 10, fence: 2, closeVoids: [] };
const labels = (m, idx) => (m.get(idx) ?? []).map((x) => `${x.tone}:${x.label}`);

test("marks: nothing for another market or no position", () => {
  assert.equal(marksFor(undefined, 0).size, 0);
  assert.equal(marksFor({ ...base, market: 1 }, 0).size, 0);
});

test("marks: a pending order shows its commit and the change it waits for", () => {
  const m = marksFor(base, 0);
  assert.deepEqual(labels(m, 10), ["commit:Order"]);
  assert.deepEqual(labels(m, 11), ["step:Update 1"]);
  assert.deepEqual(labels(m, 12), ["fill:Update 2"]);
});

test("marks: a filled order puts Fill on its print and marks skipped prints", () => {
  const m = marksFor({ ...base, fill: { idxFill: 14 } }, 0);
  assert.deepEqual(labels(m, 12), ["step:Under 1 s, skipped"]);
  assert.deepEqual(labels(m, 13), ["step:Under 1 s, skipped"]);
  assert.deepEqual(labels(m, 14), ["fill:Fill"]);
  assert.deepEqual(labels(m, 11), ["step:Update 1"]);
});

test("marks: a breach and a liquidation on the next print", () => {
  const m = marksFor({ ...base, fill: { idxFill: 12 }, breach: { idx: 20 }, liquidated: { idx: 21 } }, 0);
  assert.deepEqual(labels(m, 20), ["breach:Crossed"]);
  assert.deepEqual(labels(m, 21), ["breach:Liquidated"]);
});

test("marks: a liquidation that is not right after the breach also marks the print before it", () => {
  const m = marksFor({ ...base, fill: { idxFill: 12 }, breach: { idx: 18 }, liquidated: { idx: 21 } }, 0);
  assert.deepEqual(labels(m, 18), ["breach:Crossed"]);
  assert.deepEqual(labels(m, 20), ["breach:Still crossed"]);
  assert.deepEqual(labels(m, 21), ["breach:Liquidated"]);
});

test("marks: a close commit and its fill, due or done", () => {
  const due = marksFor({ ...base, fill: { idxFill: 12 }, closeCommit: { idxCloseCommit: 30, earliestFill: 32 } }, 0);
  assert.deepEqual(labels(due, 30), ["commit:Close requested"]);
  assert.deepEqual(labels(due, 32), ["fill:Close fill due"]);
  const done = marksFor({ ...base, fill: { idxFill: 12 }, closeCommit: { idxCloseCommit: 30, earliestFill: 32 }, closed: { idxCloseFill: 33 } }, 0);
  assert.deepEqual(labels(done, 33), ["fill:Close fill"]);
  assert.deepEqual(labels(done, 32), []);
});
