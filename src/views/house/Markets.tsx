import { useApp } from "../../app-context";
import { Skeleton } from "../../components/Skeleton";
import { Badge, TableWrap } from "../../components/ui";
import { classOf, isLiveMarket, marketsOf, type AssetClass } from "../../config/markets";
import { capShare } from "../../lib/feed";
import { compactUsd, usdc, usdcSigned } from "../../lib/format";
import { pnlByMarket } from "../../lib/house";
import { useVenueStats } from "../../lib/venue";

/** An amount against its cap: a thin bar when there is something in it, and the two numbers. */
function Oi({ value, cap }: { value: bigint; cap: bigint }) {
  const share = capShare(value, cap);
  return (
    <span className="oi">
      {value > 0n && (
        <span className="oi__bar" aria-hidden="true">
          <span style={{ width: `${share}%` }} data-high={share >= 80 || undefined} />
        </span>
      )}
      <span>
        {usdc(value, 0)} <span className="muted">of {usdc(cap, 0)} tUSDC</span>
      </span>
    </span>
  );
}

/**
 * The markets a vault backs, ranked by Hyperliquid's 24h volume: what each carries against its caps, what it has made the house,
 * and the volume and open interest on Hyperliquid that the ranking comes from. A vault the contracts do not carry yet lists its
 * markets with the venue's figures only.
 */
export function MarketsTable({ cls }: { cls: AssetClass }) {
  const { snap, ledger, ledgerReady } = useApp();
  const stats = useVenueStats().data;
  const made = ledger ? pnlByMarket(ledger.vault, ledger.positions) : new Map<number, bigint>();
  const rows = marketsOf(cls);
  const deployed = rows.some(isLiveMarket);
  return (
    <section className="panel" aria-label={`${classOf(cls).label} markets`}>
      <TableWrap className="panel__body" label={`${classOf(cls).label} markets table`}>
        <table className="table table--fit">
          <thead>
            <tr>
              <th>Market</th>
              {deployed && (
                <>
                  <th>Long interest</th>
                  <th>Short interest</th>
                  <th className="r">House P&amp;L</th>
                </>
              )}
              <th className="r">Hyperliquid 24h volume</th>
              <th className="r hide-sm">Hyperliquid open interest</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const live = isLiveMarket(d);
              const m = live ? snap?.markets[d.index!] : undefined;
              const pnl = live ? made.get(d.index!) : undefined;
              const v = stats?.[d.source];
              return (
                <tr key={d.id}>
                  <td>
                    <strong>{d.symbol}</strong> {!live && deployed && <Badge>Planned</Badge>}
                    <span className="cell-sub">{d.name}</span>
                  </td>
                  {deployed && (
                    <>
                      <td>{m ? <Oi value={m.longOI} cap={m.maxLongOI} /> : <span className="muted">–</span>}</td>
                      <td>{m ? <Oi value={m.shortOI} cap={m.maxShortOI} /> : <span className="muted">–</span>}</td>
                      <td className={`r ${!ledgerReady || pnl === undefined || pnl === 0n ? "muted" : pnl > 0n ? "text-long" : "text-short"}`}>{!ledgerReady && live ? <Skeleton w="3rem" h="0.875rem" /> : pnl !== undefined ? usdcSigned(pnl, 2) : live ? "0.00" : "–"}</td>
                    </>
                  )}
                  <td className="r">{compactUsd(v?.vol)}</td>
                  <td className="r hide-sm">{compactUsd(v?.oi)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>
      <p className="panel__foot">Listed by 24h volume on Hyperliquid, where the prices come from.</p>
    </section>
  );
}
