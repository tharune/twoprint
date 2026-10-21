import { useApp } from "../../app-context";
import { CLASSES, isLiveMarket, marketsOf, type AssetClass } from "../../config/markets";
import { capShare } from "../../lib/feed";
import { usdc, usdcSigned } from "../../lib/format";
import { houseTradingPnl } from "../../lib/netsplit";
import { navigate } from "../../lib/router";

/** The open interest a class's live markets carry, long and short together, and what its caps add up to. */
export function classInterest(cls: AssetClass, markets: { longOI: bigint; shortOI: bigint; maxLongOI: bigint; maxShortOI: bigint }[]) {
  let oi = 0n;
  let cap = 0n;
  for (const d of marketsOf(cls).filter(isLiveMarket)) {
    const m = markets[d.index!];
    if (!m) continue;
    oi += m.longOI + m.shortOI;
    cap += m.maxLongOI + m.maxShortOI;
  }
  return { oi, cap };
}

/** Every vault in one table: the joint view. A row opens that vault's own view. */
export function VaultsTable() {
  const { snap } = useApp();
  return (
    <section className="panel" aria-label="Vaults">
      <header className="panel__head">
        <h2>Vaults</h2>
        <span className="muted">Open one to see its markets</span>
      </header>
      <div className="table-wrap panel__body">
        <table className="table table--rows table--fit">
          <thead>
            <tr>
              <th>Vault</th>
              <th className="r">In the vault</th>
              <th className="r hide-sm">Open interest</th>
              <th className="r hide-sm">Cap used</th>
              <th className="r">House P&amp;L</th>
            </tr>
          </thead>
          <tbody>
            {CLASSES.map((c) => {
              const live = marketsOf(c.id).some(isLiveMarket);
              const { oi, cap } = snap ? classInterest(c.id, snap.markets) : { oi: 0n, cap: 0n };
              const pnl = snap && live ? houseTradingPnl(snap.vault) : undefined;
              const open = () => navigate("house", c.id);
              return (
                <tr
                  key={c.id}
                  tabIndex={0}
                  onClick={open}
                  onKeyDown={(e) => {
                    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      open();
                    }
                  }}
                >
                  <td>
                    <strong>{c.vault}</strong>
                    <span className="cell-sub">{(live ? marketsOf(c.id).filter(isLiveMarket) : marketsOf(c.id).slice(0, 3)).map((d) => d.symbol).join(", ")}</span>
                  </td>
                  <td className="r">{live && snap ? `${usdc(snap.vault.equity, 2)} tUSDC` : <span className="muted">Planned</span>}</td>
                  <td className="r hide-sm">{live ? `${usdc(oi, 0)} tUSDC` : "–"}</td>
                  <td className="r hide-sm">{live && cap > 0n ? `${capShare(oi, cap).toFixed(1)}%` : "–"}</td>
                  <td className={`r ${pnl === undefined || pnl === 0n ? "muted" : pnl > 0n ? "text-long" : "text-short"}`}>{pnl !== undefined ? usdcSigned(pnl, 2) : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
