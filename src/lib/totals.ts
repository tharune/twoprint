import type { FeeEv, PositionRecord } from "../hooks/data";

/** IFeeRouter.FeeType */
const FEE_WIN_PNL = 0;
const FEE_BORROW = 1;

/** What the Receipts tab adds up. Amounts are tUSDC base units (6 decimals). */
export interface ReceiptTotals {
  /** Sum of PositionClosed.pnl: gross price PnL of the closes, before carry, win fee and premium. */
  grossClosePnl: bigint;
  /** Sum of (payout - collateral) over closes and -collateral over liquidations: what the trader ends up with vs what was posted. */
  netResult: bigint;
  /** Closed plus liquidated positions. */
  settled: number;
  /** FeeCollected amounts the FeeRouter has actually received for these positions (not the fee entitlements). */
  winFeeReceived: bigint;
  carryReceived: bigint;
  /** What the vault still owes (IouRecorded minus IouPaid), by part. The event amounts on PositionClosed are entitlements; these were not paid yet. */
  iouPayout: bigint;
  iouWinFee: bigint;
  iouCarry: bigint;
}

export function summarizeReceipts(positions: PositionRecord[], fees: FeeEv[]): ReceiptTotals {
  const t: ReceiptTotals = {
    grossClosePnl: 0n,
    netResult: 0n,
    settled: 0,
    winFeeReceived: 0n,
    carryReceived: 0n,
    iouPayout: 0n,
    iouWinFee: 0n,
    iouCarry: 0n,
  };
  const ids = new Set<bigint>();
  for (const p of positions) {
    ids.add(p.id);
    if (p.closed) {
      t.grossClosePnl += p.closed.pnl;
      t.netResult += p.closed.payout - p.collateral;
      t.settled++;
    } else if (p.liquidated) {
      t.netResult -= p.collateral;
      t.settled++;
    }
    if (p.iou) {
      t.iouPayout += p.iou.traderOwed - p.iou.traderPaid;
      t.iouWinFee += p.iou.winOwed - p.iou.winPaid;
      t.iouCarry += p.iou.carryOwed - p.iou.carryPaid;
    }
  }
  for (const f of fees) {
    if (!ids.has(f.positionId)) continue;
    if (f.feeType === FEE_WIN_PNL) t.winFeeReceived += f.amount;
    else if (f.feeType === FEE_BORROW) t.carryReceived += f.amount;
  }
  return t;
}
