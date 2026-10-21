import { useMemo } from "react";
import { SequenceBars, type BarItem } from "../../components/charts/BarsChart";
import { SplitBar } from "../../components/charts/SplitBar";
import { Empty, Stat } from "../../components/ui";
import { isLive, type PositionRecord } from "../../hooks/data";
import { MARKETS, money } from "../../lib/format";
import { performance } from "../../lib/portfolio";
import { resultBars } from "../../lib/series";
import { fullTime } from "../../lib/time";

/** How your settled positions have gone: each result as a bar, what they cost in fees, how often you win, and what you hold now. */
export function Performance({ mine, clock }: { mine: PositionRecord[]; clock: (b: bigint) => number }) {
  const perf = useMemo(() => performance(mine), [mine]);
  const results = useMemo<BarItem[]>(
    () =>
      resultBars(mine, clock).map((b) => ({
        label: `#${b.id}`,
        value: b.v,
        note: `${b.liquidated ? "Liquidated" : "Closed"}, ${fullTime(b.t)}`,
      })),
    [mine, clock],
  );
  const fees = useMemo<BarItem[]>(
    () =>
      mine
        .filter((p) => p.closed)
        .sort((a, b) => Number(a.closed!.block - b.closed!.block))
        .map((p) => ({ label: `#${p.id}`, value: Number(p.closed!.winFee + p.closed!.carryPaid) / 1e6, tone: "brand" as const, note: `Profit fee ${money(Number(p.closed!.winFee) / 1e6, 4)}, hourly fee ${money(Number(p.closed!.carryPaid) / 1e6, 4)}` })),
    [mine, clock],
  );
  const live = mine.filter(isLive);
  const side = { long: 0, short: 0 };
  const byMarket = new Map<number, number>();
  for (const p of live) {
    const v = Number(p.collateral) / 1e6;
    side[p.isLong ? "long" : "short"] += v;
    byMarket.set(p.market, (byMarket.get(p.market) ?? 0) + v);
  }
  return (
    <div className="stackp">
      <div className="readings readings--six">
        <Stat label="Win rate" value={perf.winRate === null ? "–" : `${(perf.winRate * 100).toFixed(0)}%`} sub={perf.settled > 0 ? `${perf.wins} won, ${perf.losses} lost` : "Nothing settled yet"} />
        <Stat label="Average win" value={perf.avgWin === null ? "–" : `${money(perf.avgWin, 2, true)} tUSDC`} sub="Per winning position" tone={perf.avgWin ? "long" : undefined} />
        <Stat label="Average loss" value={perf.avgLoss === null ? "–" : `${money(perf.avgLoss, 2, true)} tUSDC`} sub="Per losing position" tone={perf.avgLoss ? "short" : undefined} />
        <Stat label="Fees paid" value={`${money(perf.fees, perf.fees > 0 && perf.fees < 0.01 ? 6 : 2)} tUSDC`} sub="Profit and hourly fees" />
        <Stat label="Traded" value={`${money(perf.volume, 0)} tUSDC`} sub="Position size, all orders" />
        <Stat label="Average leverage" value={perf.avgLeverage === null ? "–" : `${perf.avgLeverage.toFixed(0)}x`} sub="Across filled orders" />
      </div>

      <div className="cols2">
        <section className="panel ppanel" aria-label="Results by position">
          <header className="ppanel__head">
            <div>
              <h2>Results by position</h2>
              <p>What each settled position made or lost, after fees, in tUSDC</p>
            </div>
          </header>
          <SequenceBars mode="advanced" items={results} height={240} format={(v) => money(v, 2, true)} label="Result of each settled position" empty="Results appear here after your first close." />
        </section>
        <section className="panel ppanel" aria-label="Fees by position">
          <header className="ppanel__head">
            <div>
              <h2>Fees by position</h2>
              <p>Profit fee and hourly fee each close paid, in tUSDC</p>
            </div>
          </header>
          <SequenceBars mode="advanced" items={fees} tone="brand" height={240} format={(v) => money(v, 4)} label="Fees paid by each closed position" empty="Fees appear here after your first close." />
        </section>
      </div>

      <section className="panel ppanel" aria-label="What you hold now">
        <header className="ppanel__head">
          <div>
            <h2>What you hold now</h2>
            <p>Collateral in your open positions</p>
          </div>
        </header>
        {live.length === 0 ? (
          <Empty title="No open positions">Your exposure appears here while a position is open.</Empty>
        ) : (
          <div className="ppanel__pair">
            <div className="stackp">
              <h3 className="ppanel__sub">By side</h3>
              <SplitBar
                label="Long and short collateral"
                format={(v) => `${money(v, 2)} tUSDC`}
                parts={[
                  { label: "Long", value: side.long, tone: "long" },
                  { label: "Short", value: side.short, tone: "short" },
                ]}
              />
            </div>
            <div className="stackp">
              <h3 className="ppanel__sub">By market</h3>
              <SplitBar
                label="Collateral by market"
                format={(v) => `${money(v, 2)} tUSDC`}
                parts={[...byMarket.entries()].map(([m, v]) => ({ label: MARKETS[m], value: v, tone: m === 0 ? ("brand" as const) : ("muted" as const) }))}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
