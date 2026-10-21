// What a trader's settled positions add up to, for the Portfolio's Performance tab. Amounts are tUSDC as plain numbers.

import type { PositionRecord } from "../hooks/data";
import { netOf } from "./series";

const E6 = 1e6;

export interface Performance {
  settled: number;
  wins: number;
  losses: number;
  /** Wins over settled, 0 to 1. Null with nothing settled. */
  winRate: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  best: number | null;
  worst: number | null;
  /** Profit fees and hourly fees the closes paid. */
  fees: number;
  /** The notional of every position that filled. */
  volume: number;
  /** Leverage averaged over positions that filled, weighted by nothing. */
  avgLeverage: number | null;
}

/** A position counts as a win when it paid out more than its collateral. Cancelled orders never filled and are left out. */
export function performance(positions: readonly PositionRecord[]): Performance {
  let wins = 0;
  let losses = 0;
  let winSum = 0;
  let lossSum = 0;
  let best: number | null = null;
  let worst: number | null = null;
  let fees = 0;
  let volume = 0;
  let levSum = 0;
  let filled = 0;
  for (const p of positions) {
    if (p.fill) {
      volume += Number(p.notional) / E6;
      levSum += Number(p.leverage);
      filled++;
    }
    const net = netOf(p);
    if (net === undefined) continue;
    const v = Number(net) / E6;
    if (v > 0) {
      wins++;
      winSum += v;
    } else {
      losses++;
      lossSum += v;
    }
    best = best === null ? v : Math.max(best, v);
    worst = worst === null ? v : Math.min(worst, v);
    if (p.closed) fees += Number(p.closed.winFee + p.closed.carryPaid) / E6;
  }
  const settled = wins + losses;
  return {
    settled,
    wins,
    losses,
    winRate: settled > 0 ? wins / settled : null,
    avgWin: wins > 0 ? winSum / wins : null,
    avgLoss: losses > 0 ? lossSum / losses : null,
    best,
    worst,
    fees,
    volume,
    avgLeverage: filled > 0 ? levSum / filled : null,
  };
}
