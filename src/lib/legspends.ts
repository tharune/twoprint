import { parseEventLogs } from "viem";
import { feeRouterAbi } from "../abi/generated";
import type { LegSpendEv } from "../hooks/data";

/**
 * Every FeeRouter outflow, whatever the leg, in log order: one row per LegSpent (Σ amount == totalFeesSpent).
 * A buyback emits what it bought right after its LegSpent, in the same call (BuybackExecuted.tokensBurned,
 * KntqBuybackExecuted.kntqBought); that becomes `out`. payOps emits LegSpent only, so `out` stays null for team/ops.
 * A router deployed before the split emits BuybackExecuted alone: each one is a TWOPRINT row of its own, with no `to`.
 */
export function parseLegSpends(logs: Parameters<typeof parseEventLogs>[0]["logs"]): LegSpendEv[] {
  const rows: LegSpendEv[] = [];
  const pending: (LegSpendEv | undefined)[] = []; // per leg: the latest spend still waiting for its result event
  for (const l of parseEventLogs({ abi: feeRouterAbi, logs, eventName: ["LegSpent", "BuybackExecuted", "KntqBuybackExecuted"] })) {
    if (l.eventName === "LegSpent") {
      const row: LegSpendEv = { tx: l.transactionHash!, block: l.blockNumber!, leg: Number(l.args.leg), to: l.args.to, amount: l.args.amount, out: null };
      rows.push(row);
      pending[row.leg] = row;
    } else if (l.eventName === "KntqBuybackExecuted") {
      const row = pending[1];
      if (row) row.out = l.args.kntqBought;
      pending[1] = undefined;
    } else {
      const row = pending[0];
      if (row) row.out = l.args.tokensBurned;
      else rows.push({ tx: l.transactionHash!, block: l.blockNumber!, leg: 0, amount: l.args.usdcSpent, out: l.args.tokensBurned });
      pending[0] = undefined;
    }
  }
  return rows;
}

/** The "Received" cell of the Receipts outflow table, with `fmt` formatting the token amount. */
export const receivedLabelFor =
  (fmt: (v: bigint) => string) =>
  (s: LegSpendEv): string => {
    if (s.leg === 2) return "paid out, no swap"; // IFeeRouter.Leg.TEAM_OPS
    if (s.out === null) return "–";
    return `${fmt(s.out)} ${s.leg === 0 ? "DEMO burned" : "KNTQ bought"}`;
  };

/** The same, in base units. */
export const receivedLabel = receivedLabelFor((v) => v.toString());
