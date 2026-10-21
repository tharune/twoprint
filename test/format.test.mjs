import test from "node:test";
import assert from "node:assert/strict";
import { fixed, money, movePct, trimmed, usdc, usdcFine, usdcSigned } from "../src/lib/format.js";

// Amounts are shown rounded, not cut off, so the figures on a receipt add up to the collateral that was put in.

test("amounts round half away from zero instead of being cut off", () => {
  assert.equal(usdc(1_999_999n), "2.00");
  assert.equal(usdc(1_994_999n), "1.99");
  assert.equal(usdc(1_995_000n), "2.00");
  assert.equal(usdc(-1_995_000n), "−2.00");
  assert.equal(usdc(999_999_999n), "1,000.00");
  assert.equal(usdc(1_500_000n, 0), "2");
});

test("a loss that rounds to nothing has no minus sign", () => {
  assert.equal(usdc(-4_000n), "0.00");
  assert.equal(usdcSigned(-4_000n), "0.00");
  assert.equal(usdcSigned(4_000n), "+0.00");
});

test("every place of a figure is kept when asked for, so an input can be filled back in exactly", () => {
  assert.equal(fixed(1_234_567n, 6, 6), "1.234567");
  assert.equal(fixed(20_000_000n, 6, 6), "20.000000");
});

test("a receipt adds up: payout and net result are rounded the same way", () => {
  // 20 tUSDC in, a position that lost 1.149400 and paid 0.000876 in carry: the payout is 18.849724.
  const collateral = 20_000_000n;
  const payout = 18_849_724n;
  const net = payout - collateral;
  const shown = (v) => Number(v.replace("−", "-").replace(/,/g, ""));
  assert.ok(Math.abs(shown(usdc(payout)) + shown(usdc(-net)) - shown(usdc(collateral))) < 0.0051);
  assert.equal(usdc(payout), "18.85");
  assert.equal(usdcSigned(net), "−1.15");
});

test("a fee under a cent keeps its digits, and anything else is shown to the cent", () => {
  assert.equal(usdcFine(345n), "0.000345");
  assert.equal(usdcFine(9_999n), "0.009999");
  assert.equal(usdcFine(10_000n), "0.01");
  assert.equal(usdcFine(0n), "0.00");
  assert.equal(usdcFine(19_729_875n), "19.73");
  assert.equal(usdcFine(undefined), "–");
});

test("a price move reads as a percentage", () => {
  assert.equal(movePct(5), "+0.05%");
  assert.equal(movePct(-24), "−0.24%");
  assert.equal(movePct(0), "0.00%");
  assert.equal(movePct(-0.3), "0.00%"); // a move that rounds to nothing has no sign
});

test("a plain tUSDC number keeps its sign only when asked and loses it when it rounds to nothing", () => {
  assert.equal(money(3.8149, 2), "3.81");
  assert.equal(money(-3.8149, 2), "−3.81");
  assert.equal(money(3.8149, 2, true), "+3.81");
  assert.equal(money(0, 2, true), "0.00");
  assert.equal(money(-0.004, 2, true), "0.00"); // a small loss that rounds to nothing is not "−0.00"
  assert.equal(money(0.001878, 6), "0.001878");
  assert.equal(money(100003.8149, 2), "100,003.81");
});

test("the ticks on an axis drop the zeros at the end of their decimals and leave whole numbers alone", () => {
  assert.equal(trimmed("12.00"), "12");
  assert.equal(trimmed("+12.50"), "+12.5");
  assert.equal(trimmed("0.0800"), "0.08");
  assert.equal(trimmed("1,000.00"), "1,000");
  assert.equal(trimmed("100"), "100");
  assert.equal(trimmed("2,000 tUSDC"), "2,000 tUSDC");
  assert.equal(trimmed(money(0, 2, true)), "0");
});
