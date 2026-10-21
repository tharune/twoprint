import { useMemo, useState } from "react";
import { useApp } from "../app-context";
import { Sparkline } from "../components/charts/Sparkline";
import { Badge, Button, PageHeader, TableWrap, Tabs } from "../components/ui";
import { CLASSES, MARKET_DEFS, classOf, isLiveMarket, type AssetClass, type MarketDef } from "../config/markets";
import { compactUsd, movePct, px } from "../lib/format";
import { navigate } from "../lib/router";
import { tickLabel } from "../lib/ticks";
import { useWeeklyCloses } from "../lib/spark";
import { useVenueStats } from "../lib/venue";

type Scope = "all" | AssetClass;

/**
 * Every market the venue lists, deepest first, with its price, its move over a day, a week of prices and the venue's volume and
 * open interest. A market the contracts carry opens its chart and ticket; the rest are listed ahead of their vaults. An Advanced page.
 */
export function Markets() {
  const { snap, selectMarket } = useApp();
  const stats = useVenueStats().data;
  const [scope, setScope] = useState<Scope>("all");
  const rows = useMemo(() => {
    const pool = MARKET_DEFS.filter((d) => scope === "all" || d.class === scope);
    return [...pool].sort((a, b) => Number(isLiveMarket(b)) - Number(isLiveMarket(a)) || (stats?.[b.source]?.vol ?? b.liq.vol * 1e6) - (stats?.[a.source]?.vol ?? a.liq.vol * 1e6));
  }, [scope, stats]);
  const weeks = useWeeklyCloses(rows.map((d) => d.source));
  const open = (d: MarketDef) => {
    selectMarket(d.id);
    navigate("trade");
  };
  return (
    <div className="wrap">
      <PageHeader title="Markets" lede="The markets Twoprint lists, deepest first. BTC and ETH trade today. The others are listed for reference until their vaults exist." />
      <div className="pagetabs">
        <Tabs
          label="Asset class"
          idPrefix="markets"
          value={scope}
          onChange={setScope}
          tabs={[{ value: "all" as Scope, label: "All" }, ...CLASSES.map((c) => ({ value: c.id as Scope, label: c.label }))]}
        />
      </div>
      <section className="panel" aria-label="Markets" id={`markets-panel-${scope}`} role="tabpanel" aria-labelledby={`markets-tab-${scope}`}>
        <TableWrap className="panel__body" label="Markets table">
          <table className="table table--rows table--fit">
            <thead>
              <tr>
                <th>Market</th>
                <th className="r">Price</th>
                <th className="r">24h</th>
                <th className="hide-sm">Last 7 days</th>
                <th className="r hide-sm">Volume</th>
                <th className="r hide-sm">Open interest</th>
                <th className="hide-sm">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const live = isLiveMarket(d);
                const s = stats?.[d.source];
                const oracle = live ? snap?.markets[d.index!]?.latest?.oraclePx : undefined;
                const change = s?.change != null ? s.change * 10_000 : null;
                return (
                  // The whole row opens the market for a pointer; a keyboard has the button at its end, so the row is not a tab stop.
                  <tr key={d.id} onClick={() => open(d)}>
                    <td>
                      <strong>{d.symbol}</strong> {!live && <Badge>Planned</Badge>}
                      <span className="cell-sub">
                        {d.name}, {classOf(d.class).label}
                      </span>
                    </td>
                    <td className="r">{oracle !== undefined ? px(oracle, d.index!) : s ? tickLabel(s.px, d.dp) : "–"}</td>
                    <td className={`r ${change === null ? "muted" : change >= 0.5 ? "text-long" : change <= -0.5 ? "text-short" : ""}`}>{change === null ? "–" : movePct(change)}</td>
                    <td className="hide-sm">
                      <Sparkline values={weeks[d.source] ?? []} />
                    </td>
                    <td className="r hide-sm">{s ? compactUsd(s.vol) : "–"}</td>
                    <td className="r hide-sm">{s ? compactUsd(s.oi) : "–"}</td>
                    <td className="hide-sm cell-actions-col" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant={live ? "primary" : "secondary"} onClick={() => open(d)}>
                        {live ? "Trade" : "Chart"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
        <p className="panel__foot">Prices, volume and open interest are Hyperliquid&rsquo;s, the venue the oracle reads. A live market shows the oracle&rsquo;s own price.</p>
      </section>
    </div>
  );
}
