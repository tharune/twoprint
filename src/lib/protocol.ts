// Protocol rules and request builders for the final contract interface, in one place.
import type { Abi } from "viem";
import { positionManagerAbi } from "../abi/generated";
import type { Deployment } from "../config/chains";

/** PositionManager timing constants (FILL_AFTER_MS, MAX_FILL_DELAY_SEC, VOID_AFTER_SEC). */
export const FILL_AFTER_MS = 1_000;
export const MAX_FILL_DELAY_SEC = 120;
export const VOID_AFTER_SEC = 150;
/** No opens above this leverage inside the weekday blackout windows (PositionManager.BLACKOUT_MAX_LEV). */
export const BLACKOUT_MAX_LEV = 100;

/** The three steps of an order in the order you meet them. The landing page and the fill-rules dialog both tell them. */
export const ORDER_STEPS: { title: string; text: string }[] = [
  {
    title: "Place your order",
    text: "It is recorded on-chain but does not fill yet. Its fill price is a later price update.",
  },
  {
    title: "Wait for the second price update",
    text: "It fills on the second price update from Hyperliquid’s oracle after you place it. If that update is stamped less than 1 second after your order, it fills on the first later update stamped at least 1 second after your order instead (the stamp comes from the price signer’s clock). If the fill update is stamped more than 120 seconds after your order, or none arrives within 150 seconds, the order is cancelled and refunded in full.",
  },
  {
    title: "Fill at the worse of two prices",
    text: "You get the worse of Hyperliquid’s oracle price and its order-book price, adjusted for the usual gap between the two. The difference goes to the vault, never to fees.",
  },
];

/** What decides a liquidation. It is a rule that applies while a position is open, not a step, so the dialog sets it apart. */
export const LIQUIDATION_RULE = {
  title: "Liquidation takes two price updates in a row",
  text: "One price update past your liquidation price costs your reserved premium. A second one in a row closes the position. You lose your collateral and nothing more, and there is no liquidation fee.",
};

const ORD: Record<number, string> = { 2: "second", 3: "third", 4: "fourth" };

/** The fill rule in one sentence. Its purpose claim stays off: the G2 attacker replay did not pass (replay/reports/G2-verdict-2026-10-18.md). */
export function fillSentence(fence: number) {
  const rule = `You fill at the ${ORD[fence] ?? `${fence}th`} Hyperliquid price update after your order lands, at the worse of the oracle price and the order-book price`;
  return `${rule}. In our own replay tests, one strategy that reads a faster price feed made a small profit on BTC, so we make no claim that this rule stops faster feeds from trading ahead of the house.`;
}

export const TIMING_COPY = "Your order fills on the second price update after you place it or, if that one is stamped less than 1 s after your order, on the first later update stamped at least 1 s after your order (the stamp is the price signer's clock). If the fill update is stamped more than 120 s after your order, or none arrives within 150 s, it is cancelled and refunded in full.";
export const LIQ_COPY = "Two price updates in a row beyond your liquidation price liquidate you. The first one costs your reserved premium. A single update never liquidates you.";

/** Default max-premium guard: quoted premium × this. Override with VITE_MAX_PREMIUM_MULT. */
export const DEFAULT_PREMIUM_GUARD = (() => {
  const env = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : undefined;
  const v = env ? Number(env.VITE_MAX_PREMIUM_MULT) : NaN;
  return Number.isFinite(v) && v >= 1 ? v : 1.25;
})();

/** ceil(quoted × mult), in tUSDC units. */
export function maxPremiumFor(quoted: bigint, mult: number): bigint {
  const m = BigInt(Math.round(mult * 10_000));
  return (quoted * m + 9_999n) / 10_000n;
}

/** PositionManager's MarginTooThin check: (collateral − premium) × 1e8 must exceed notional × maxFillAdjE8 × 2. */
export function marginTooThin(collateral: bigint, premium: bigint, notional: bigint, maxFillAdjE8: number): boolean {
  if (premium >= collateral) return true;
  return (collateral - premium) * 100_000_000n <= notional * BigInt(maxFillAdjE8) * 2n;
}

const pm = (d: Deployment) => ({ address: d.PositionManager, abi: positionManagerAbi as unknown as Abi });

/** The only place that builds commitOpen's arguments. */
export const commitOpenRequest = (d: Deployment, market: number, isLong: boolean, collateral: bigint, leverage: number, maxPremium: bigint) =>
  ({ ...pm(d), functionName: "commitOpen", args: [market, isLong, collateral, BigInt(leverage), maxPremium] }) as const;
export const commitCloseRequest = (d: Deployment, id: bigint) => ({ ...pm(d), functionName: "commitClose", args: [id] }) as const;
/** Commit additional margin to an open position (effective at idxCommit + fence, >= 1 s). */
export const commitAddMarginRequest = (d: Deployment, id: bigint, amount: bigint) =>
  ({ ...pm(d), functionName: "commitAddMargin", args: [id, amount] }) as const;
export const settleRequest = (d: Deployment, id: bigint) => ({ ...pm(d), functionName: "settle", args: [id] }) as const;
/** Permissionless: voids a pending open with no qualifying fill print after VOID_AFTER_SEC. */
export const cancelExpiredRequest = (d: Deployment, id: bigint) => ({ ...pm(d), functionName: "cancelExpired", args: [id] }) as const;
/** Permissionless: pays outstanding IOUs in FIFO order, up to maxItems. */
export const claimIousRequest = (d: Deployment, maxItems = 10n) => ({ ...pm(d), functionName: "claim", args: [maxItems] }) as const;
/** Withdraw payouts that were deferred because a transfer to the account failed. */
export const withdrawClaimableRequest = (d: Deployment, to: `0x${string}`) => ({ ...pm(d), functionName: "withdrawClaimable", args: [to] }) as const;
