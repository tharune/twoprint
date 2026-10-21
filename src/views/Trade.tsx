import { Suspense, lazy, useMemo } from "react";
import { useApp } from "../app-context";
import { Fill } from "../components/charts/Fill";
import { DevBench } from "../components/DevBench";
import { DraftProvider, useDraft } from "../components/draft";
import { MarketBar, RejectedNote } from "../components/Market";
import { DepthChart } from "../components/DepthChart";
import { NativeChart } from "../components/NativeChart";
import { OpenStrip, PositionsPanel } from "../components/Positions";
import { PriceChart } from "../components/PriceChart";
import { PrintChart, type ChartPreview } from "../components/PrintChart";
import { Ticket } from "../components/Ticket";
import { Tabs } from "../components/ui";
import { DEV } from "../config/dev";
import { isLive } from "../hooks/data";
import { useMode } from "../lib/mode";
import { usePref } from "../lib/prefs";

// TradingView's embed is only fetched when the advanced layout shows it.
const TradingViewChart = lazy(() => import("../components/TradingViewChart"));

const CHARTS = ["chart", "depth", "tradingview", "oracle"] as const;
type ChartTab = (typeof CHARTS)[number];

/**
 * One page in two layouts, chosen by the switch in the header. Both have the market bar on top, a chart and your positions on
 * the left and the ticket on the right. Basic keeps each of them short: a plain price chart, your open positions in a line each,
 * and the ticket's essentials. Advanced swaps in the exchange's chart, the oracle's print chart, the position tables and every
 * control a regular trader reaches for.
 */
export function Trade() {
  const [mode] = useMode();
  const advanced = mode === "advanced";
  return (
    <DraftProvider>
      <div className="wrap">
        <h1 className="sr-only">Trade</h1>
        <div className="trade" data-mode={mode}>
          <MarketBar advanced={advanced} />
          <RejectedNote />
          <div className="tgrid">
            <div className="tgrid__chart">{advanced ? <ChartPanel /> : <PriceChart />}</div>
            <aside className="tgrid__side" aria-label="Order ticket">
              <div className="panel tcard">
                <Ticket mode={mode} />
              </div>
            </aside>
            <div className="tgrid__list">{advanced ? <PositionsPanel /> : <OpenStrip />}</div>
          </div>
        </div>
        {DEV && <DevBench />}
      </div>
    </DraftProvider>
  );
}

/**
 * The candles with the oracle's prices over them and your orders on them, TradingView's own chart for those who want its drawing
 * tools, and the oracle's print chart: a step per print with your commit, fill and any breach drawn on it.
 */
function ChartPanel() {
  const { selected, marketLive } = useApp();
  const [picked, setPicked] = usePref<ChartTab>("twoprint.chartTab", CHARTS, "chart");
  // A market the contracts do not carry has no oracle prints to draw.
  const tab: ChartTab = !marketLive && picked === "oracle" ? "chart" : picked;
  const tabs: { value: ChartTab; label: string }[] = [
    { value: "chart", label: "Chart" },
    { value: "depth", label: "Depth" },
    { value: "tradingview", label: "TradingView" },
    ...(marketLive ? [{ value: "oracle" as const, label: "Oracle prints" }] : []),
  ];
  return (
    <section className="panel chartpanel" aria-label="Charts">
      <header className="panel__bar">
        <Tabs label="Chart" idPrefix="chart" value={tab} onChange={setPicked} tabs={tabs} />
      </header>
      <div role="tabpanel" id={`chart-panel-${tab}`} aria-labelledby={`chart-tab-${tab}`} className="chartpanel__body">
        {tab === "chart" && (
          <>
            <NativeChart />
            <p className="chartpanel__foot">Candles and volume come from Hyperliquid. {marketLive ? "The oracle’s own prices are drawn over them. Orders fill at the worse of the oracle price and the order-book price." : ""}</p>
          </>
        )}
        {tab === "depth" && (
          <>
            <DepthChart />
            <p className="chartpanel__foot">Cumulative volume at Hyperliquid’s returned price levels, refreshed every two seconds. Orders fill at the worse of the oracle and the basis-adjusted book mid.</p>
          </>
        )}
        {tab === "tradingview" && (
          <>
            <div className="chartpanel__frame">
              <Suspense
                fallback={
                  <div className="tv">
                    <p className="tv__state" role="status">
                      Loading the chart
                    </p>
                  </div>
                }
              >
                <TradingViewChart symbol={selected.tv} />
              </Suspense>
            </div>
            <p className="chartpanel__foot">
              Chart by{" "}
              <a href="https://www.tradingview.com/" target="_blank" rel="noopener nofollow">
                TradingView
              </a>
              , from an exchange feed. Orders fill at the worse of the oracle price and the order-book price, which can differ a little from this chart.
            </p>
          </>
        )}
        {tab === "oracle" && <OracleChart />}
      </div>
    </section>
  );
}

function OracleChart() {
  const { snap, market, prints, focus, focusId, focusAt, setFocusId } = useApp();
  const ms = snap?.markets[market];
  const list = prints[market];
  // The snapshot and the event ledger are read separately, so either can be a print ahead of the other.
  const lastIdx = Math.max(ms ? ms.count - 1 : -1, list.at(-1)?.idx ?? -1);
  const { isLong, quote, touchedAt } = useDraft();
  const fence = snap?.pm.fence ?? 2;
  const liq = quote?.liq;
  const preview = useMemo<ChartPreview>(() => ({ isLong, level: liq !== undefined && liq > 0n ? liq : null, fence }), [isLong, liq, fence]);
  // The chart follows a live order. With none, it shows the order that was picked until the ticket is edited, and the ticket's draft otherwise.
  const here = !!focus && focus.market === market;
  const picked = here && !isLive(focus) && focusId !== null && touchedAt < focusAt;
  const story = here && (isLive(focus) || picked);
  // A picked order is drawn over the prints it spanned, as long as they are still held.
  const archived = picked && list.length > 0 && list[0].idx <= focus.idxCommit;
  return (
    <>
      {archived && (
        <p className="chartpanel__pinned">
          Showing order #{focus.id.toString()}.{" "}
          <button type="button" className="linklike" onClick={() => setFocusId(null)}>
            Show the latest price updates
          </button>
        </p>
      )}
      <Fill min={400}>{(h) => <PrintChart prints={list} market={market} focus={story ? focus : undefined} lastIdx={lastIdx} height={h} preview={story ? null : preview} history={archived} />}</Fill>
      <p className="chartpanel__foot">One step per price update from the oracle. Your order, its fill and any breach sit on the update they happened at. Dashed steps are updates still to come.</p>
    </>
  );
}
