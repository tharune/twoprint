import { useMemo } from "react";
import { PnlChart } from "../../components/charts/PnlChart";
import type { PositionRecord } from "../../hooks/data";
import { money } from "../../lib/format";
import { useMode } from "../../lib/mode";
import { pnlSteps } from "../../lib/series";

/**
 * Your profit and loss as it built up: a step for every position that settled, each adding what it made or lost after fees,
 * green above zero and red below it. Hover a step to see which order it was. Advanced marks each one and draws what each added.
 */
export function PnlPanel({ mine, clock, loading }: { mine: PositionRecord[]; clock: (b: bigint) => number; loading?: boolean }) {
  const [mode] = useMode();
  const data = useMemo(() => pnlSteps(mine, clock), [mine, clock]);
  const total = data?.steps.at(-1)?.v ?? 0;
  const tone = total > 0 ? "text-long" : total < 0 ? "text-short" : "";
  return (
    <section className="panel ppanel" aria-label="Profit and loss">
      <header className="ppanel__head">
        <div>
          <h2>Profit and loss</h2>
          <p>Positions you have closed, after fees</p>
        </div>
        <p className={`ppanel__now ${tone}`}>{money(total, 2, true)} tUSDC</p>
      </header>
      <PnlChart
        mode={mode}
        steps={data?.steps ?? []}
        height={mode === "advanced" ? 380 : 250}
        loading={loading}
        label="Profit and loss over time"
        empty="Your profit and loss appears here once you have opened a position."
      />
    </section>
  );
}
