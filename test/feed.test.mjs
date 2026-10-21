import test from "node:test";
import assert from "node:assert/strict";
import { capShare, feedView } from "../src/lib/feed.js";

// The landing page must never call a dead feed live: the oracle's state is the first thing a visitor reads.

const NOW = 1_800_000_000_000;
const snap = (over = {}) => ({ fetchedAt: NOW - 800, ring: { isFresh: true, lastSrcTimeMs: BigInt(NOW - 1_400), lastPostTimestamp: BigInt(Math.floor((NOW - 1_000) / 1000)), ...over } });

test("a fresh read of a fresh feed is live, with the age of its last print", () => {
  assert.deepEqual(feedView(snap(), NOW), { state: "live", label: "Live", age: "1.4 s" });
});

test("a fresh read of a feed the contract calls stale says stale and how long ago it last posted", () => {
  const nineHours = 9 * 3600 + 24 * 60;
  const v = feedView(snap({ isFresh: false, lastPostTimestamp: BigInt(Math.floor(NOW / 1000) - nineHours) }), NOW);
  assert.equal(v.state, "stale");
  assert.equal(v.label, "Stale");
  assert.equal(v.age, "9.4 h");
});

test("a snapshot older than 10 s is not updating, even if the ring said fresh when it was read", () => {
  const old = { ...snap(), fetchedAt: NOW - 10_001 };
  assert.equal(feedView(old, NOW).state, "frozen");
  assert.equal(feedView({ ...snap(), fetchedAt: NOW - 9_999 }, NOW).state, "live");
});

test("no snapshot yet is reading, and a stale feed that never posted has no age", () => {
  assert.deepEqual(feedView(undefined, NOW), { state: "reading", label: "Loading", age: "" });
  assert.equal(feedView(snap({ isFresh: false, lastPostTimestamp: 0n }), NOW).age, "");
});

test("the contract still saying fresh does not make a feed live when its last post is older than the ring's limit on this clock (a chain that makes no blocks)", () => {
  const sec = Math.floor(NOW / 1000);
  const halted = feedView(snap({ lastPostTimestamp: BigInt(sec - 5 * 3600), maxAgeSec: 10 }), NOW);
  assert.deepEqual(halted, { state: "stale", label: "Stale", age: "5.0 h" });
  assert.equal(feedView(snap({ lastPostTimestamp: BigInt(sec - 14), maxAgeSec: 10 }), NOW).state, "live", "within the limit plus 5 s for clocks");
  assert.equal(feedView(snap({ lastPostTimestamp: BigInt(sec - 16), maxAgeSec: 10 }), NOW).state, "stale");
});

test("a cap share is a percentage, never above 100, and zero against a zero cap", () => {
  assert.equal(capShare(2_000n, 300_000n), 0.66);
  assert.equal(capShare(150_000n, 150_000n), 100);
  assert.equal(capShare(400_000n, 150_000n), 100);
  assert.equal(capShare(5n, 0n), 0);
  assert.equal(capShare(0n, 10n), 0);
});
