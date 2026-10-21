import { useEffect, useRef, useState } from "react";
import { useApp } from "../app-context";
import { useNow } from "../hooks/data";
import { FEED_DOT, feedView } from "../lib/feed";
import { bp, compactUsd, diffBp, e8ToBp, movePct, px } from "../lib/format";
import { tickLabel } from "../lib/ticks";
import { useVenueStats } from "../lib/venue";
import { IconInfo } from "./icons";
import { MarketPicker } from "./MarketPicker";

/** "up" or "down" for a moment after the price ticks, and a counter that restarts the animation on every tick. */
export function useTick(value: bigint | undefined, market: number) {
  const prev = useRef<{ value?: bigint; market: number }>({ market });
  const [tick, setTick] = useState<{ dir: "up" | "down" | null; n: number }>({ dir: null, n: 0 });
  useEffect(() => {
    const before = prev.current;
    prev.current = { value, market };
    if (value === undefined || before.market !== market || before.value === undefined || before.value === value) return;
    setTick((t) => ({ dir: value > before.value! ? "up" : "down", n: t.n + 1 }));
    const off = setTimeout(() => setTick((t) => ({ ...t, dir: null })), 900);
    return () => clearTimeout(off);
  }, [value, market]);
  return tick;
}

/**
 * The selected market's price and its change over 24 h. A market the contracts carry shows the oracle's price, the one orders
 * fill against. One they do not carry yet shows the venue's own price, so its chart and its place in the list still mean something.
 */
export function Quote() {
  const { snap, market, marketLive, selected } = useApp();
  const stat = useVenueStats().data?.[selected.source];
  const latest = marketLive ? snap?.markets[market]?.latest : undefined;
  const tick = useTick(marketLive ? latest?.oraclePx : undefined, market);
  const now = useNow(1000);
  const feed = feedView(snap, now);
  const stale = marketLive && !!snap && feed.state !== "live";
  const price = marketLive ? (latest ? px(latest.oraclePx, market) : "–") : stat ? tickLabel(stat.px, selected.dp) : "–";
  const change = stat?.change != null ? stat.change * 10_000 : null;
  return (
    <div className="quote">
      <span key={tick.n} className="quote__px" data-tick={tick.dir ?? undefined} aria-label={`${selected.symbol} ${marketLive ? "oracle" : "reference"} price`}>
        {price}
      </span>
      {stale && <span className="muted"> {feed.label.toLowerCase()}{feed.age ? `, ${feed.age} ago` : ""}</span>}
      {change !== null && (
        <span className="quote__meta">
          <span className={`delta ${change >= 0.5 ? "delta--up" : change <= -0.5 ? "delta--down" : ""}`}>{movePct(change)}</span>
          <span className="muted">24h</span>
        </span>
      )}
    </div>
  );
}

/** The feed's state in one line: a dot, the word and how long ago the last price was signed. */
function OracleStatus() {
  const { snap } = useApp();
  const now = useNow(1000);
  const feed = feedView(snap, now);
  return (
    <span className="oracle-status">
      <span className="live-dot" data-state={FEED_DOT[feed.state]} aria-hidden="true" />
      {feed.label}
      {feed.age && <span className="muted"> {feed.age} ago</span>}
    </span>
  );
}

/** What sits beside the price: the venue's volume and open interest, and in Advanced the oracle's own readings. */
export function MarketStats({ advanced }: { advanced: boolean }) {
  const { snap, market, marketLive, selected } = useApp();
  const stat = useVenueStats().data?.[selected.source];
  const ms = marketLive ? snap?.markets[market] : undefined;
  const latest = ms?.latest;
  const gap = latest ? diffBp(latest.midPx, latest.oraclePx) : null;
  return (
    <dl className="mstats">
      {advanced && marketLive && (
        <>
          <div>
            <dt>Oracle</dt>
            <dd>
              <OracleStatus />
            </dd>
          </div>
          <div>
            <dt>Book mid</dt>
            <dd>
              {latest ? px(latest.midPx, market) : "–"} {gap !== null && <span className="muted">{bp(gap, 1)}</span>}
            </dd>
          </div>
          <div>
            <dt>Basis</dt>
            <dd>{ms ? bp(e8ToBp(ms.basisNowE8), 2) : "–"}</dd>
          </div>
          <div>
            <dt>Volatility</dt>
            <dd>{ms ? `${e8ToBp(ms.sigmaE8).toFixed(2)} bp per update` : "–"}</dd>
          </div>
        </>
      )}
      <div>
        <dt>24h volume</dt>
        <dd>{stat ? compactUsd(stat.vol) : "–"}</dd>
      </div>
      <div>
        <dt>Open interest</dt>
        <dd>{stat ? compactUsd(stat.oi) : "–"}</dd>
      </div>
    </dl>
  );
}

/** The bar above the chart and the ticket: the market, its price, and what to know about it. */
export function MarketBar({ advanced }: { advanced: boolean }) {
  return (
    <section className="panel mbar" aria-label="Market">
      <div className="mbar__lead">
        <MarketPicker />
        <Quote />
      </div>
      <MarketStats advanced={advanced} />
    </section>
  );
}

/** Prices the PriceRing skipped because the jump was past its bound. Shown only when there are some. */
export function RejectedNote() {
  const { market, marketLive, ledger } = useApp();
  const rejected = marketLive ? (ledger?.rejected ?? []).filter((r) => r.market === market) : [];
  if (rejected.length === 0) return null;
  const last = rejected.at(-1)!;
  return (
    <p className="mnote" title="The price feed skips a price whose jump exceeds its bound, which grows with the time since the last update.">
      <IconInfo />
      {rejected.length} price{rejected.length > 1 ? "s were" : " was"} skipped for jumping too far. The latest was {px(last.oraclePx, market)} against {px(last.prevOraclePx, market)}.
    </p>
  );
}
