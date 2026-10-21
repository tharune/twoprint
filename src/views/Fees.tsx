import { useMemo } from "react";
import { useApp } from "../app-context";
import { SequenceBars, type BarItem } from "../components/charts/BarsChart";
import { SplitBar } from "../components/charts/SplitBar";
import { PageLoading } from "../components/Skeleton";
import { PageHeader, Stat } from "../components/ui";
import { useClock } from "../hooks/useClock";
import { money, usdc, usdcFine } from "../lib/format";
import { feeBars } from "../lib/series";
import { fullTime } from "../lib/time";
import { enabledLegs, legLabel } from "../lib/split";
import { FeesPanel } from "./house/Fees";

/** Every fee you pay, what is held, what each fee account has spent, and every payment out. An Advanced page. */
export function Fees() {
  const { snap, ledger, ledgerReady } = useApp();
  const clock = useClock();
  const fees = ledger?.fees ?? [];
  const bars = useMemo<BarItem[]>(
    () =>
      feeBars(fees, clock).map((b) => ({
        label: `#${b.id}`,
        value: b.v,
        tone: b.type === 0 ? ("brand" as const) : ("muted" as const),
        note: `${b.type === 0 ? "Profit fee" : "Hourly fee"}, ${fullTime(b.t)}`,
      })),
    [fees.length, clock],
  );
  const f = snap?.fees;
  const split = f?.split ?? null;
  const parts = split ? enabledLegs(split.mask).map((leg) => ({ label: legLabel(leg), value: Number(split.accrued[leg]) / 1e6, tone: (leg === 0 ? "brand" : leg === 1 ? "long" : "muted") as "brand" | "long" | "muted" })) : [];
  return (
    <div className="wrap">
      <PageHeader title="Fees" lede="Every fee goes to a fee account kept apart from the vaults. Here is what it holds, what it has spent and on what." />
      {!f ? (
        <PageLoading strip={3} />
      ) : (
      <div className="stackp">
        {f && (
          <div className="readings">
            <Stat label="Held" value={`${usdcFine(f.balance)} tUSDC`} sub="Not yet spent" />
            <Stat label="Collected" value={`${usdcFine(f.totalFeesAccrued)} tUSDC`} sub={`${usdc(f.win, 4)} profit fees, ${usdc(f.borrow, 4)} hourly fees`} />
            <Stat label="Spent" value={`${usdcFine(f.totalFeesSpent)} tUSDC`} sub="On buybacks and the team" />
          </div>
        )}
        <div className="cols2 cols2--wide">
          <section className="panel ppanel" aria-label="Fees collected">
            <header className="ppanel__head">
              <div>
                <h2>Fees collected</h2>
                <p>One bar for each fee the fee account received, in tUSDC</p>
              </div>
            </header>
            <SequenceBars mode="advanced" items={bars} loading={!ledgerReady} height={250} format={(v) => money(v, 4)} label="Fees collected, one bar for each" empty="Bars appear here once a position closes and pays a fee." />
            <p className="ppanel__key">
              <span className="split__key">
                <i className="split__swatch split__part--brand" aria-hidden="true" />
                Profit fee
              </span>
              <span className="split__key">
                <i className="split__swatch split__part--slate" aria-hidden="true" />
                Hourly fee
              </span>
            </p>
          </section>
          <div className="stackp">
            <section className="panel ppanel" aria-label="Where fees go">
              <header className="ppanel__head">
                <div>
                  <h2>Where fees go</h2>
                  <p>Each share of what has been collected</p>
                </div>
              </header>
              <SplitBar label="Fees collected, by where they go" parts={parts} format={(v) => `${money(v, 4)} tUSDC`} empty="Nothing collected yet" />
            </section>
            <section className="panel ppanel" aria-label="Where fees come from">
              <header className="ppanel__head">
                <div>
                  <h2>Where fees come from</h2>
                  <p>The profit fee and the hourly fee, as shares of what has been collected</p>
                </div>
              </header>
              <SplitBar
                label="Fees collected, by kind"
                parts={[
                  { label: "Profit fee", value: Number(f.win) / 1e6, tone: "brand" },
                  { label: "Hourly fee", value: Number(f.borrow) / 1e6, tone: "slate" },
                ]}
                format={(v) => `${money(v, 4)} tUSDC`}
                empty="Nothing collected yet"
              />
            </section>
          </div>
        </div>
        <FeesPanel />
      </div>
      )}
    </div>
  );
}
