// Time series for the Portfolio and House charts, built from the event ledger. The ledger keeps a block number for every event
// and a time only for the oracle's prints, so an event's time is read off the prints around its block.

import type { FeeEv, PositionRecord, PrintEv, VaultEv } from "../hooks/data";
import type { AssetClass } from "../config/markets";
import { marketAt } from "../config/markets";

/** A moment, a value and what happened. Times are milliseconds, values are tUSDC as plain numbers. */
export interface Step {
  t: number;
  v: number;
  note?: string;
}

const E6 = 1e6;
/** Elysium's rough block time, only for events older than every print the ledger still holds. */
const FALLBACK_MS_PER_BLOCK = 150;

/**
 * Turns a block number into a time. Between two prints it reads the line through them; outside the prints the ledger holds it
 * carries on at the pace those prints set. With no prints at all every block is "now", which draws nothing misleading, only flat.
 */
export function blockClock(prints: readonly (readonly PrintEv[])[], now = Date.now()): (block: bigint) => number {
  const pts: { b: number; t: number }[] = [];
  for (const list of prints) for (const p of list) if (p.srcTimeMs > 0) pts.push({ b: Number(p.block), t: p.srcTimeMs });
  pts.sort((a, c) => a.b - c.b || a.t - c.t);
  const xs: { b: number; t: number }[] = [];
  for (const p of pts) if (xs.length === 0 || p.b > xs[xs.length - 1].b) xs.push(p);
  if (xs.length === 0) return () => now;
  const first = xs[0];
  const last = xs[xs.length - 1];
  const pace = last.b > first.b && last.t > first.t ? (last.t - first.t) / (last.b - first.b) : FALLBACK_MS_PER_BLOCK;
  return (block) => {
    const b = Number(block);
    if (b <= first.b) return first.t - (first.b - b) * pace;
    if (b >= last.b) return last.t + (b - last.b) * pace;
    let lo = 0;
    let hi = xs.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid].b <= b) lo = mid;
      else hi = mid;
    }
    const a = xs[lo];
    const c = xs[hi];
    return a.t + ((b - a.b) / (c.b - a.b)) * (c.t - a.t);
  };
}

/** What a settled position cost or earned its trader: the payout against all collateral put in, or the whole collateral lost. */
export function netOf(p: PositionRecord): bigint | undefined {
  return p.closed ? p.closed.payout - p.collateral : p.liquidated ? -p.collateral : undefined;
}

/** When a position settled, as a block. */
export const settledBlock = (p: PositionRecord): bigint | undefined => p.closed?.block ?? p.liquidated?.block;

/**
 * A trader's profit and loss as it built up: one step for every position that settled, each adding what that position made or
 * lost after fees. The line starts at zero at the moment of the first order.
 */
export function pnlSteps(positions: readonly PositionRecord[], clock: (b: bigint) => number): { steps: Step[]; start: number } | null {
  const done = positions.filter((p) => settledBlock(p) !== undefined).sort((a, b) => Number(settledBlock(a)! - settledBlock(b)!));
  if (positions.length === 0) return null;
  const start = clock(positions.reduce((m, p) => (p.commit.block < m ? p.commit.block : m), positions[0].commit.block));
  let total = 0;
  const steps: Step[] = [{ t: start, v: 0 }];
  for (const p of done) {
    total += Number(netOf(p)!) / E6;
    const label = `${p.liquidated ? "Liquidated" : "Closed"} order #${p.id}`;
    steps.push({ t: Math.max(clock(settledBlock(p)!), steps[steps.length - 1].t), v: total, note: label });
  }
  return { steps, start };
}

/** The house's trading P&L after each settlement of a vault (or of every vault), from zero at the first one. */
export function houseSteps(
  events: readonly VaultEv[],
  positions: ReadonlyMap<bigint, PositionRecord>,
  clock: (b: bigint) => number,
  cls?: AssetClass,
): { steps: Step[]; start: number } | null {
  const mine = events.filter((e) => {
    if (!cls) return true;
    const p = positions.get(e.positionId);
    return !!p && marketAt(p.market)?.class === cls;
  });
  if (mine.length === 0) return null;
  const start = clock(mine[0].block) - 60_000;
  let total = 0;
  const steps: Step[] = [{ t: start, v: 0 }];
  for (const e of mine) {
    total += Number(e.vaultDelta) / E6;
    steps.push({ t: Math.max(clock(e.block), steps[steps.length - 1].t), v: total, note: `Order #${e.positionId} settled` });
  }
  return { steps, start };
}

/** Fees the FeeRouter received, one bar for each, oldest first. `type` is IFeeRouter.FeeType: 0 profit fee, 1 hourly fee. */
export function feeBars(fees: readonly FeeEv[], clock: (b: bigint) => number): { t: number; v: number; type: number; id: bigint }[] {
  return [...fees]
    .sort((a, b) => Number(a.block - b.block))
    .map((f) => ({ t: clock(f.block), v: Number(f.amount) / E6, type: f.feeType, id: f.positionId }));
}

/** Net results of settled positions in the order they settled, for a bar each. */
export function resultBars(positions: readonly PositionRecord[], clock: (b: bigint) => number): { t: number; v: number; id: bigint; liquidated: boolean }[] {
  return positions
    .filter((p) => settledBlock(p) !== undefined)
    .sort((a, b) => Number(settledBlock(a)! - settledBlock(b)!))
    .map((p) => ({ t: clock(settledBlock(p)!), v: Number(netOf(p)!) / E6, id: p.id, liquidated: !!p.liquidated }));
}

/** What each settlement did to the house, one bar each, oldest first: positive when the vault won, negative when it paid out. */
export function settlementBars(
  events: readonly VaultEv[],
  positions: ReadonlyMap<bigint, PositionRecord>,
  clock: (b: bigint) => number,
  cls?: AssetClass,
): { t: number; v: number; id: bigint }[] {
  return events
    .filter((e) => {
      if (!cls) return true;
      const p = positions.get(e.positionId);
      return !!p && marketAt(p.market)?.class === cls;
    })
    .map((e) => ({ t: clock(e.block), v: Number(e.vaultDelta) / E6, id: e.positionId }));
}

/**
 * What traders have held open against the house, long and short, as it changed: a fill adds the position's size to its side and
 * its settlement takes it away again. Each side starts at zero a minute before the first fill. A vault's own run counts only its markets.
 */
export function interestSteps(
  positions: Iterable<PositionRecord>,
  clock: (b: bigint) => number,
  cls?: AssetClass,
): { long: Step[]; short: Step[] } | null {
  const moves: { block: bigint; long: boolean; size: number; note: string }[] = [];
  for (const p of positions) {
    if (!p.fill) continue;
    if (cls && marketAt(p.market)?.class !== cls) continue;
    const size = Number(p.notional) / E6;
    moves.push({ block: p.fill.block, long: p.isLong, size, note: `Opened order #${p.id}` });
    const end = settledBlock(p);
    if (end !== undefined) moves.push({ block: end, long: p.isLong, size: -size, note: `${p.liquidated ? "Liquidated" : "Closed"} order #${p.id}` });
  }
  if (moves.length === 0) return null;
  moves.sort((a, b) => Number(a.block - b.block));
  const start = clock(moves[0].block) - 60_000;
  const out = { long: [{ t: start, v: 0 }] as Step[], short: [{ t: start, v: 0 }] as Step[] };
  const held = { long: 0, short: 0 };
  for (const m of moves) {
    const side = m.long ? "long" : "short";
    held[side] += m.size;
    const steps = out[side];
    steps.push({ t: Math.max(clock(m.block), steps[steps.length - 1].t), v: held[side], note: m.note });
  }
  return out;
}
