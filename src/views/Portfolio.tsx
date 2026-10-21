import { useMemo } from "react";
import { useApp } from "../app-context";
import { Deferred, LiveTable } from "../components/Positions";
import { ConnectMenu } from "../components/Wallet";
import { Skeleton, SkeletonPanel } from "../components/Skeleton";
import { Button, Empty, PageHeader, Stat, Tabs } from "../components/ui";
import { isLive, stateOf } from "../hooks/data";
import { useClock } from "../hooks/useClock";
import { usdc, usdcSigned } from "../lib/format";
import { markPnl } from "../lib/math";
import { useMode } from "../lib/mode";
import { navigate } from "../lib/router";
import { summarizeReceipts } from "../lib/totals";
import { PnlPanel } from "./portfolio/PnlPanel";
import { Performance } from "./portfolio/Performance";
import { Results } from "./portfolio/Results";
import { ReceiptsPanel } from "./Receipts";

const TABS = ["positions", "history", "performance"] as const;
type Tab = (typeof TABS)[number];

/**
 * What you hold and what it has done. Basic is one short page: the figures, your profit and loss as a chart, your open positions
 * and your latest results. Advanced adds tabs for the full position table, the receipts with their CSV, and a performance review.
 */
export function Portfolio({ tab }: { tab: string | null }) {
  const { snap, positions, address, ledger, ledgerReady } = useApp();
  const [mode] = useMode();
  const advanced = mode === "advanced";
  const current: Tab = (TABS as readonly string[]).includes(tab ?? "") ? (tab as Tab) : "positions";

  const mine = useMemo(() => positions.filter((p) => !!address && p.trader.toLowerCase() === address.toLowerCase()).sort((a, b) => Number(b.id - a.id)), [positions, address]);
  const live = mine.filter(isLive);
  const done = mine.filter((p) => !isLive(p));
  const clock = useClock();

  let inPositions = 0n;
  let unrealized = 0n;
  for (const p of live) {
    inPositions += p.collateral;
    const latest = snap?.markets[p.market]?.latest;
    if (p.fill && latest && stateOf(p) !== "PendingOpen") unrealized += markPnl(p.fill.fillPx, latest.oraclePx, p.notional, p.isLong);
  }
  const settled = summarizeReceipts(done, ledger?.fees ?? []);
  const realized = settled.netResult;

  const signedOut = !address;
  const user = snap?.user;
  const positionsPanel = !ledgerReady ? (
    <SkeletonPanel rows={2} />
  ) : live.length === 0 ? (
      <section className="panel" aria-label="Open positions">
        <Empty
          title="No open positions"
          action={
            <Button size="sm" variant="secondary" onClick={() => navigate("trade")}>
              Open a position
            </Button>
          }
        >
          Your open positions show up here.
        </Empty>
      </section>
    ) : (
      <section className="panel" aria-label="Open positions">
        <header className="panel__head">
          <h2>Open positions</h2>
          <span className="muted">{live.length} open</span>
        </header>
        <div className="panel__body">
          <LiveTable rows={live} />
        </div>
      </section>
    );

  return (
    <div className="wrap">
      <PageHeader title="Portfolio" />

      {signedOut ? (
        <section className="panel soon">
          <h2>Connect a wallet to see your portfolio</h2>
          <p>Your positions and history are read from the chain for the wallet you connect.</p>
          <ConnectMenu size="md" />
        </section>
      ) : (
        <>
          <ul className="cards">
            <li className="panel kpi">
              <Stat label="Wallet balance" value={user ? `${usdc(user.usdc, 2)} tUSDC` : "–"} />
            </li>
            <li className="panel kpi">
              <Stat label="In open positions" value={ledgerReady ? `${usdc(inPositions, 2)} tUSDC` : <Skeleton w="6rem" h="1.5rem" />} sub={ledgerReady ? `${live.length} position${live.length === 1 ? "" : "s"}` : undefined} />
            </li>
            <li className="panel kpi">
              <Stat label="Open profit/loss" value={ledgerReady ? `${usdcSigned(unrealized, 2)} tUSDC` : <Skeleton w="6rem" h="1.5rem" />} tone={ledgerReady ? (unrealized > 0n ? "long" : unrealized < 0n ? "short" : undefined) : undefined} />
            </li>
            <li className="panel kpi">
              <Stat
                label="Closed profit/loss"
                value={ledgerReady ? `${usdcSigned(realized, 2)} tUSDC` : <Skeleton w="6rem" h="1.5rem" />}
                tone={ledgerReady ? (realized > 0n ? "long" : realized < 0n ? "short" : undefined) : undefined}
                sub={ledgerReady ? `${settled.settled} settled, after fees` : undefined}
              />
            </li>
          </ul>

          {user && user.claimable > 0n && <Deferred amount={user.claimable} to={user.address} />}

          {!advanced ? (
            <div className="stackp">
              <PnlPanel mine={mine} clock={clock} loading={!ledgerReady} />
              {positionsPanel}
              {ledgerReady ? <Results done={done} clock={clock} /> : <SkeletonPanel rows={3} />}
            </div>
          ) : (
            <>
              <div className="pagetabs">
                <Tabs
                  label="Portfolio"
                  idPrefix="portfolio"
                  value={current}
                  onChange={(t) => navigate("portfolio", t === "positions" ? undefined : t)}
                  tabs={[
                    { value: "positions", label: "Positions", count: ledgerReady ? live.length : undefined },
                    { value: "history", label: "History", count: ledgerReady ? done.length : undefined },
                    { value: "performance", label: "Performance" },
                  ]}
                />
              </div>
              <div role="tabpanel" id={`portfolio-panel-${current}`} aria-labelledby={`portfolio-tab-${current}`} className="stackp">
                {current === "positions" && (
                  <>
                    <PnlPanel mine={mine} clock={clock} loading={!ledgerReady} />
                    {positionsPanel}
                  </>
                )}
                {current === "history" && (ledgerReady ? <ReceiptsPanel /> : <SkeletonPanel rows={5} />)}
                {current === "performance" && (ledgerReady ? <Performance mine={mine} clock={clock} /> : <SkeletonPanel chart />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
