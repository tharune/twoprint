import { useMemo } from "react";
import { useApp } from "../../app-context";
import { SequenceBars, type BarItem } from "../../components/charts/BarsChart";
import { InterestChart } from "../../components/charts/InterestChart";
import { PnlChart } from "../../components/charts/PnlChart";
import { RankBars, type Rank } from "../../components/charts/RankBars";
import { SplitBar } from "../../components/charts/SplitBar";
import { Skeleton, SkeletonList } from "../../components/Skeleton";
import { Empty, Gauge } from "../../components/ui";
import { DEPLOYED_MARKETS, classOf, liveMarkets, marketAt, type AssetClass } from "../../config/markets";
import { useClock } from "../../hooks/useClock";
import { MARKETS, money, usdc } from "../../lib/format";
import { pnlByMarket } from "../../lib/house";
import { useMode } from "../../lib/mode";
import { houseSteps, interestSteps, settlementBars } from "../../lib/series";
import { fullTime } from "../../lib/time";

/** What the house has made from trading, settlement by settlement: green above zero, red below it. One vault's run, or all of them. */
export function HousePnl({ cls, title }: { cls?: AssetClass; title: string }) {
  const { ledger, ledgerReady, positions } = useApp();
  const clock = useClock();
  const [mode] = useMode();
  const data = useMemo(() => (ledger ? houseSteps(ledger.vault, ledger.positions, clock, cls) : null), [ledger, ledger?.vault.length, positions.length, clock, cls]);
  const total = data?.steps.at(-1)?.v ?? 0;
  const tone = total > 0 ? "text-long" : total < 0 ? "text-short" : "";
  return (
    <section className="panel ppanel" aria-label={title}>
      <header className="ppanel__head">
        <div>
          <h2>{title}</h2>
          <p>What traders lost to the vault less what it paid them, before fees</p>
        </div>
        <p className={`ppanel__now ${ledgerReady ? tone : ""}`}>{ledgerReady ? `${money(total, 2, true)} tUSDC` : <Skeleton w="7rem" h="1.5rem" />}</p>
      </header>
      <PnlChart
        mode={mode}
        steps={data?.steps ?? []}
        height={mode === "advanced" ? 400 : 250}
        loading={!ledgerReady}
        label={`${title} over time`}
        empty="The chart starts when the first position settles."
      />
    </section>
  );
}

/**
 * How full the caps are: the vault's open interest split between long and short, and each market's sides against its own cap.
 * Advanced adds how much was held on each side over time.
 */
export function OpenInterest({ cls }: { cls?: AssetClass }) {
  const { snap, ledger, ledgerReady, positions } = useApp();
  const clock = useClock();
  const [mode] = useMode();
  const held = useMemo(() => (ledger && ledgerReady && mode === "advanced" ? interestSteps(ledger.positions.values(), clock, cls) : null), [ledger, ledgerReady, ledger?.vault.length, positions, clock, cls, mode]);
  if (!snap) return null;
  const rows = liveMarkets(DEPLOYED_MARKETS)
    .filter((d) => !cls || d.class === cls)
    .map((d) => ({ i: d.index!, m: snap.markets[d.index!] }))
    .filter((r) => !!r.m);
  const long = rows.reduce((a, r) => a + Number(r.m.longOI) / 1e6, 0);
  const short = rows.reduce((a, r) => a + Number(r.m.shortOI) / 1e6, 0);
  const k = (v: bigint) => usdc(v, 0);
  return (
    <section className="panel ppanel" aria-label="Open interest">
      <header className="ppanel__head">
        <div>
          <h2>Open interest</h2>
          <p>What traders hold against {cls ? `the ${classOf(cls).vault.toLowerCase()}` : "the vaults"}, and how close each side is to its cap</p>
        </div>
      </header>
      {rows.length === 0 ? (
        <Empty title="Nothing open">No positions are open against this vault.</Empty>
      ) : (
        <div className="stackp">
          <SplitBar
            label="Long and short open interest"
            format={(v) => `${money(v, 0)} tUSDC`}
            parts={[
              { label: "Long", value: long, tone: "long" },
              { label: "Short", value: short, tone: "short" },
            ]}
            empty="No open positions"
          />
          <div className="gauges gauges--pair">
            {rows.flatMap((r) => [
              <Gauge key={`${r.i}l`} label={`${MARKETS[r.i]} long`} value={r.m.longOI} cap={r.m.maxLongOI} fmt={k} />,
              <Gauge key={`${r.i}s`} label={`${MARKETS[r.i]} short`} value={r.m.shortOI} cap={r.m.maxShortOI} fmt={k} />,
            ])}
          </div>
          {mode === "advanced" && (
            <InterestChart mode={mode} long={held?.long ?? []} short={held?.short ?? []} height={200} loading={!ledgerReady} label="Open interest over time, long and short" empty="The chart starts when the first position fills." />
          )}
        </div>
      )}
    </section>
  );
}

/** What each settlement did to the house, one bar each in the order they settled: green when the vault won, red when it paid out. */
export function Settlements({ cls }: { cls?: AssetClass }) {
  const { ledger, ledgerReady, positions } = useApp();
  const clock = useClock();
  const [mode] = useMode();
  const bars = useMemo<BarItem[]>(
    () => (ledger ? settlementBars(ledger.vault, ledger.positions, clock, cls).map((b) => ({ label: `#${b.id}`, value: b.v, note: fullTime(b.t) })) : []),
    [ledger, ledger?.vault.length, positions.length, clock, cls],
  );
  return (
    <section className="panel ppanel" aria-label="Each settlement">
      <header className="ppanel__head">
        <div>
          <h2>Each settlement</h2>
          <p>What each closed or liquidated position did to the vault, in tUSDC</p>
        </div>
      </header>
      <SequenceBars
        mode={mode}
        items={bars}
        height={200}
        loading={!ledgerReady}
        format={(v) => money(v, 2, true)}
        label="House profit and loss of each settlement"
        empty="Bars appear here once a position settles."
      />
    </section>
  );
}

/** What each market has made the house. */
export function PnlByMarket() {
  const { ledger, ledgerReady, positions } = useApp();
  const made = useMemo(() => (ledger ? pnlByMarket(ledger.vault, ledger.positions) : new Map<number, bigint>()), [ledger, ledger?.vault.length, positions.length]);
  const items: Rank[] = MARKETS.map((name, i) => ({ label: name, value: Number(made.get(i) ?? 0n) / 1e6, sub: classOf(marketAt(i)?.class ?? "crypto").label }));
  return (
    <section className="panel ppanel" aria-label="House P&L by market">
      <header className="ppanel__head">
        <div>
          <h2>By market</h2>
          <p>What each market has made the house</p>
        </div>
      </header>
      {ledgerReady ? <RankBars items={items} format={(v) => `${money(v, 2, true)} tUSDC`} label="House profit and loss by market" /> : <SkeletonList rows={4} />}
    </section>
  );
}
