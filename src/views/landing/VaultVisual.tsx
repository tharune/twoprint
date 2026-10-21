import { useApp } from "../../app-context";
import { Sparkline } from "../../components/charts/Sparkline";
import { CLASSES, DEPLOYED_MARKETS, isLiveMarket, liveMarkets, marketsOf } from "../../config/markets";
import { useNow } from "../../hooks/data";
import { feedView } from "../../lib/feed";
import { movePct, px, usdc } from "../../lib/format";
import { useWeeklyCloses } from "../../lib/spark";

/**
 * The four kinds of market, each with a vault of its own. Crypto is the one the contracts carry today, so it opens out into its
 * markets with their prices and a week of movement, all read live; the others are named and marked as planned.
 */
export function VaultVisual() {
  const { snap } = useApp();
  const now = useNow(1000);
  const fresh = !!snap && feedView(snap, now).state === "live";
  const live = liveMarkets(DEPLOYED_MARKETS);
  const weeks = useWeeklyCloses(live.map((d) => d.source));
  return (
    <ul className="stage vaults" aria-label="Vaults by kind of market">
      {CLASSES.map((c, k) => {
        const all = marketsOf(c.id);
        const here = all.filter(isLiveMarket);
        const isLive = here.length > 0;
        // Names read better than tickers for stocks and commodities. A currency pair has no name that says which pair it is.
        const shown = (isLive ? here : all.slice(0, 3)).map((m) => (c.id === "forex" ? m.symbol : m.name)).join(", ");
        return (
          <li key={c.id} className="vault" data-live={isLive || undefined} style={{ ["--k" as string]: k }}>
            <p className="vault__head">
              <b>{c.label}</b>
              <span className="vault__state">
                {isLive && <span className="live-dot" data-state="ok" aria-hidden="true" />}
                {isLive ? "Live" : "Planned"}
              </span>
            </p>
            {isLive ? (
              <>
                <ul className="vault__rows">
                  {here.map((d) => {
                    const latest = snap?.markets[d.index!]?.latest?.oraclePx;
                    // The move is over the same week the line shows, so the colour, the shape and the number always agree.
                    // A live feed extends the week's closes to the oracle's current price.
                    const week = weeks[d.source];
                    const closes = week && fresh && latest !== undefined ? [...week, Number(latest) / 1e8] : week;
                    const change = closes && closes.length > 1 && closes[0] > 0 ? closes[closes.length - 1] / closes[0] - 1 : null;
                    return (
                      <li key={d.id} className="vault__row">
                        <span className="vault__sym">
                          <b>{d.symbol}</b>
                          <small>{d.name}</small>
                        </span>
                        <Sparkline values={closes ?? []} width={84} height={30} live={fresh} />
                        <span className="vault__px">
                          <b>
                            {latest !== undefined ? px(latest, d.index!) : "–"}
                            {!fresh && latest !== undefined && <span className="muted"> stale</span>}
                          </b>
                          {change != null && <small className={change >= 0 ? "text-long" : "text-short"}>{movePct(change * 10_000)} 7d</small>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="vault__foot">{snap ? `${usdc(snap.vault.equity, 2)} tUSDC in the vault` : "Loading the vault"}</p>
              </>
            ) : (
              <p className="vault__markets">{shown}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
