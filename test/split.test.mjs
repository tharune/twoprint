import test from "node:test";
import assert from "node:assert/strict";
import { enabledLegs, legLabel, shareLabel, splitLine, splitPhrase, splitSentence } from "../src/lib/split.js";

// The fee-split copy for each structure Tommy listed: balanced 0x07, basic 0x05, full value accrual 0x03.

test("balanced, basic and full value accrual read correctly", () => {
  assert.equal(splitPhrase(0x07), "a TWOPRINT buyback, a KNTQ buyback and team/ops, a third each");
  assert.equal(splitPhrase(0x05), "a TWOPRINT buyback and team/ops, half each");
  assert.equal(splitPhrase(0x03), "a TWOPRINT buyback and a KNTQ buyback, half each");
  assert.equal(splitPhrase(0x01), "a TWOPRINT buyback");
  assert.equal(splitLine(0x07), "⅓ TWOPRINT buyback · ⅓ KNTQ buyback · ⅓ team/ops");
  assert.equal(splitLine(0x05), "½ TWOPRINT buyback · ½ team/ops");
});

test("the split reads as a sentence of its own", () => {
  assert.equal(splitSentence(0x07), "A third of fees buy back TWOPRINT, a third buy back KNTQ and a third go to the team");
  assert.equal(splitSentence(0x05), "Half of fees buy back TWOPRINT and half go to the team");
  assert.equal(splitSentence(0x04), "All fees go to the team");
  assert.equal(splitSentence(0x01), "All fees buy back TWOPRINT");
  assert.equal(splitSentence(0x00), "");
});

test("legs and labels follow the mask", () => {
  assert.deepEqual(enabledLegs(0x06), [1, 2]);
  assert.equal(shareLabel(0x04), "all");
  assert.deepEqual([0, 1, 2].map(legLabel), ["TWOPRINT buyback", "KNTQ buyback", "Team/ops"]);
  assert.equal(legLabel(7), "Leg 7");
});
