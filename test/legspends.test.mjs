import test from "node:test";
import assert from "node:assert/strict";
import { encodeAbiParameters, encodeEventTopics } from "viem";
import { feeRouterAbi } from "../src/abi/generated.js";
import { parseLegSpends, receivedLabel } from "../src/lib/legspends.js";

// FSA-1: Receipts must itemize every FeeRouter outflow (LegSpent), not only the TWOPRINT BuybackExecuted, so that the
// itemized total reconciles with FeeRouter.totalFeesSpent (== Σ LegSpent).

const FR = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const ADAPTER_TWOPRINT = "0x1111111111111111111111111111111111111111";
const ADAPTER_KNTQ = "0x2222222222222222222222222222222222222222";
const OPS = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
const TRADER = "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc";
const LEG = { TWOPRINT: 0, KNTQ: 1, OPS: 2 };
const U = 1_000_000n; // 1 tUSDC

let logIndex = 0;
const hash = (n) => `0x${n.toString(16).padStart(64, "0")}`;

/** A raw log exactly as eth_getLogs returns it for a FeeRouter event (real ABI encoding). */
function frLog(eventName, args, txn, block) {
  const ev = feeRouterAbi.find((e) => e.type === "event" && e.name === eventName);
  const data = ev.inputs.filter((i) => !i.indexed);
  return {
    address: FR,
    topics: encodeEventTopics({ abi: feeRouterAbi, eventName, args }),
    data: encodeAbiParameters(data, data.map((i) => args[i.name])),
    transactionHash: hash(txn),
    blockNumber: BigInt(block),
    logIndex: logIndex++,
  };
}

const feeCollected = (txn, block, amount) => frLog("FeeCollected", { feeType: 0, trader: TRADER, positionId: 1n, amount }, txn, block);
const legSpent = (leg, to, amount, txn, block) => frLog("LegSpent", { leg, to, amount }, txn, block);
const buyback = (usdcSpent, tokensBurned, txn, block) => frLog("BuybackExecuted", { usdcSpent, tokensBurned }, txn, block);
const kntqBuyback = (usdcSpent, kntqBought, txn, block) => frLog("KntqBuybackExecuted", { usdcSpent, kntqBought }, txn, block);

const sum = (rows) => rows.reduce((a, r) => a + r.amount, 0n);

test("FSA-1: KNTQ buyback and team/ops payout are itemized, and the total reconciles with totalFeesSpent", () => {
  // The finder's scenario: 90 tUSDC of fees (30 per leg), then executeKntqBuyback(30), payOps(10), executeBuyback(20).
  const logs = [
    feeCollected(1, 10, 90n * U),
    legSpent(LEG.KNTQ, ADAPTER_KNTQ, 30n * U, 2, 11),
    kntqBuyback(30n * U, 28n * U, 2, 11),
    legSpent(LEG.OPS, OPS, 10n * U, 3, 12),
    legSpent(LEG.TWOPRINT, ADAPTER_TWOPRINT, 20n * U, 4, 13),
    buyback(20n * U, 19n * U, 4, 13),
  ];
  const rows = parseLegSpends(logs);

  assert.equal(rows.length, 3, "one row per outflow, every leg");
  assert.deepEqual(
    rows.map((r) => [r.leg, r.to.toLowerCase(), r.amount, r.out, r.tx, r.block]),
    [
      [LEG.KNTQ, ADAPTER_KNTQ, 30n * U, 28n * U, hash(2), 11n],
      [LEG.OPS, OPS.toLowerCase(), 10n * U, null, hash(3), 12n],
      [LEG.TWOPRINT, ADAPTER_TWOPRINT, 20n * U, 19n * U, hash(4), 13n],
    ],
  );
  assert.equal(sum(rows), 60n * U, "Σ LegSpent == totalFeesSpent (20 + 30 + 10)");
  assert.deepEqual(rows.map(receivedLabel), ["28000000 KNTQ bought", "paid out, no swap", "19000000 DEMO burned"]);
});

test("FSA-1: a TWOPRINT-only history still lists the buyback with its tokens burned", () => {
  const rows = parseLegSpends([legSpent(LEG.TWOPRINT, ADAPTER_TWOPRINT, 20n * U, 5, 20), buyback(20n * U, 19n * U, 5, 20)]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].leg, LEG.TWOPRINT);
  assert.equal(rows[0].out, 19n * U);
});

test("FSA-1: several outflows in one transaction each keep their own result", () => {
  // e.g. an executor contract calling executeBuyback twice and executeKntqBuyback once in one tx
  const rows = parseLegSpends([
    legSpent(LEG.TWOPRINT, ADAPTER_TWOPRINT, 5n * U, 6, 30),
    buyback(5n * U, 4n * U, 6, 30),
    legSpent(LEG.KNTQ, ADAPTER_KNTQ, 7n * U, 6, 30),
    kntqBuyback(7n * U, 6n * U, 6, 30),
    legSpent(LEG.TWOPRINT, ADAPTER_TWOPRINT, 3n * U, 6, 30),
    buyback(3n * U, 2n * U, 6, 30),
  ]);
  assert.deepEqual(
    rows.map((r) => [r.leg, r.amount, r.out]),
    [
      [LEG.TWOPRINT, 5n * U, 4n * U],
      [LEG.KNTQ, 7n * U, 6n * U],
      [LEG.TWOPRINT, 3n * U, 2n * U],
    ],
  );
});

test("FSA-1: a router deployed before the split (BuybackExecuted only) keeps its buyback rows", () => {
  const rows = parseLegSpends([
    feeCollected(10, 50, 100n * U),
    buyback(40n * U, 39n * U, 11, 51),
    buyback(10n * U, 9n * U, 12, 52),
  ]);
  assert.deepEqual(
    rows.map((r) => [r.leg, r.to, r.amount, r.out, r.tx, r.block]),
    [
      [LEG.TWOPRINT, undefined, 40n * U, 39n * U, hash(11), 51n],
      [LEG.TWOPRINT, undefined, 10n * U, 9n * U, hash(12), 52n],
    ],
  );
  assert.equal(sum(rows), 50n * U);
  assert.deepEqual(rows.map(receivedLabel), ["39000000 DEMO burned", "9000000 DEMO burned"]);
});

test("FSA-1: fee collections and admin events are not outflows", () => {
  const rows = parseLegSpends([
    feeCollected(7, 40, 90n * U),
    frLog("AdapterSet", { adapter: ADAPTER_TWOPRINT }, 8, 41),
    frLog("KntqAdapterSet", { adapter: ADAPTER_KNTQ }, 9, 42),
  ]);
  assert.deepEqual(rows, []);
  assert.deepEqual(parseLegSpends([]), []);
});
