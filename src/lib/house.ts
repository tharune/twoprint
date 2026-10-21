// What the house has made and what it carries, per kind of market. The vault's own events say what it took in and paid out; a
// settlement belongs to a market through its position, and a market belongs to a kind of market (an asset class).
import type { PositionRecord, VaultEv } from "../hooks/data";
import { marketAt, type AssetClass } from "../config/markets";

export interface PnlPoint {
  block: bigint;
  /** The house's trading P&L after this settlement, in tUSDC units (6 decimals). */
  total: bigint;
}

/** Whether a settlement belongs to a kind of market. A settlement whose position is unknown belongs to none. */
function inClass(e: VaultEv, positions: ReadonlyMap<bigint, PositionRecord>, cls: AssetClass): boolean {
  const p = positions.get(e.positionId);
  return !!p && marketAt(p.market)?.class === cls;
}

/**
 * The house's trading P&L after each settlement, in the order they happened. The sum of every `vaultDelta` is the vault's
 * premiums received plus trading inflow minus trading outflow, which is what the House page's headline figure is. Pass `cls`
 * for one vault's own run.
 */
export function pnlSeries(events: readonly VaultEv[], positions: ReadonlyMap<bigint, PositionRecord>, cls?: AssetClass): PnlPoint[] {
  const out: PnlPoint[] = [];
  let total = 0n;
  for (const e of events) {
    if (cls && !inClass(e, positions, cls)) continue;
    total += e.vaultDelta;
    out.push({ block: e.block, total });
  }
  return out;
}

/** What each market has made the house, by contract index. A market with no settlements is absent. */
export function pnlByMarket(events: readonly VaultEv[], positions: ReadonlyMap<bigint, PositionRecord>): Map<number, bigint> {
  const out = new Map<number, bigint>();
  for (const e of events) {
    const p = positions.get(e.positionId);
    if (p) out.set(p.market, (out.get(p.market) ?? 0n) + e.vaultDelta);
  }
  return out;
}
