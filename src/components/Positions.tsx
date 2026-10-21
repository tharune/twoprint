import { type KeyboardEvent } from "react";
import { type Address } from "viem";
import { useApp } from "../app-context";
import { isLive, stateOf, type PositionRecord, type Snapshot } from "../hooks/data";
import { useTx } from "../hooks/tx";
import { computeLiquidationDistance } from "../lib/alerts";
import { MARKETS, px, short, usdc, usdcFine, usdcSigned } from "../lib/format";
import { markPnl } from "../lib/math";
import { withdrawClaimableRequest } from "../lib/protocol";
import { href } from "../lib/router";
import { levelNow } from "../lib/receipt";
import { useMode } from "../lib/mode";
import { usePref } from "../lib/prefs";
import { OrderActions } from "./OrderActions";
import { BufferBar, RiskBadge } from "./risk";
import { SkeletonPanel } from "./Skeleton";
import { Badge, Button, Empty, Notice, SideBadge, Tabs } from "./ui";

/** Enter or Space on a focusable row does what a click does. */
const rowKeys = (fn: () => void) => (e: KeyboardEvent) => {
  if (e.target !== e.currentTarget) return;
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

const newest = (a: PositionRecord, b: PositionRecord) => Number(b.id - a.id);
const owns = (p: PositionRecord, address: Address | undefined) => !!address && p.trader.toLowerCase() === address.toLowerCase();

/** What a live position is worth now: profit or loss at the oracle, as a share of its margin, and how close the liquidation price is. */
function livePosition(p: PositionRecord, snap: Snapshot | undefined) {
  const latest = snap?.markets[p.market]?.latest;
  const margin = p.collateral - p.premium;
  const pnl = p.fill && latest ? markPnl(p.fill.fillPx, latest.oraclePx, p.notional, p.isLong) : undefined;
  const pnlPct = pnl !== undefined && margin > 0n ? (Number(pnl) / Number(margin)) * 100 : undefined;
  const risk =
    p.fill && latest
      ? computeLiquidationDistance({ oraclePx: latest.oraclePx, entryPx: p.fill.fillPx, liqPx: levelNow(p)!, margin, notional: p.notional, isLong: p.isLong })
      : undefined;
  return { pnl, pnlPct, risk };
}

const STATUS_LABEL = { PendingOpen: "Pending fill", PendingClose: "Closing", Open: "Open" } as const;

// ---------------------------------------------------------------- tables

/**
 * Open and pending positions, one row each. A row opens the order. Basic keeps what you need to watch a position and close it;
 * Advanced adds the entry price and the button for adding collateral.
 */
export function LiveTable({ rows }: { rows: PositionRecord[] }) {
  const { snap, address, focusId, openOrder } = useApp();
  const [mode] = useMode();
  const advanced = mode === "advanced";
  return (
    <div className="table-wrap">
      <table className="table table--rows table--fit">
        <thead>
          <tr>
            <th>Position</th>
            <th>Status</th>
            {advanced && <th className="r hide-sm">Entry</th>}
            <th className="r hide-sm">Liquidation price</th>
            <th className="r">Profit/loss</th>
            <th className="hide-sm">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const st = stateOf(p) as keyof typeof STATUS_LABEL;
            const mine = owns(p, address);
            const { pnl, pnlPct, risk } = livePosition(p, snap);
            const marginBusy = (p.marginPending ?? 0n) > 0n;
            const open = () => openOrder(p.id);
            return (
              <tr key={p.id.toString()} tabIndex={0} data-focused={focusId === p.id || undefined} onClick={open} onKeyDown={rowKeys(open)}>
                <td>
                  <span className="inline-gap">
                    <SideBadge isLong={p.isLong} />
                    <strong>
                      {MARKETS[p.market]} {p.leverage.toString()}x
                    </strong>
                  </span>
                  <span className="cell-sub">
                    Order #{p.id.toString()}, {usdc(p.collateral)} tUSDC{!mine && `, ${short(p.trader)}`}
                    {marginBusy && <span className="text-brand">, +{usdc(p.marginPending!)} pending</span>}
                  </span>
                </td>
                <td>
                  <Badge tone={st === "Open" ? "long" : "carbon"} dot>
                    {STATUS_LABEL[st]}
                  </Badge>
                  <span className={st === "Open" && p.closeVoids.length === 0 && !p.breach ? "cell-sub cell-sub--line" : "cell-sub"}>
                    {st === "PendingOpen" ? "Waiting for the fill" : st === "PendingClose" ? "Waiting for the exit price" : `Since print ${p.fill!.idxFill}`}
                    {p.closeVoids.length > 0 && `, ${p.closeVoids.length} close cancelled`}
                  </span>
                  {p.breach && <span className="cell-sub text-short">Premium used at print {p.breach.idx}. Two price updates in a row beyond your liquidation price liquidate you.</span>}
                </td>
                {advanced && <td className="r hide-sm">{p.fill ? px(p.fill.fillPx, p.market) : "–"}</td>}
                <td className="r hide-sm">
                  <span className={p.fill ? "text-short" : "muted"}>{p.fill ? px(levelNow(p)!, p.market) : "–"}</span>
                  {risk && (
                    <span className="cell-sub cell-sub--risk">
                      <BufferBar pct={risk.bufferRemainingPct} tier={risk.alertTier} />
                      {risk.alertTier === "SAFE" ? `${Math.min(100, risk.bufferRemainingPct).toFixed(1)}% left` : <RiskBadge tier={risk.alertTier} />}
                    </span>
                  )}
                </td>
                <td className={`r ${pnl === undefined ? "" : pnl >= 0n ? "text-long" : "text-short"}`}>
                  {pnl !== undefined ? usdcSigned(pnl) : "–"}
                  {pnlPct !== undefined && <span className="cell-sub">{pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}% of margin</span>}
                </td>
                <td className="cell-actions-col hide-sm" onClick={(e) => e.stopPropagation()}>
                  <OrderActions p={p} mine={mine} small show={advanced ? ["addCollateral", "close"] : ["close"]} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Closed, liquidated and cancelled orders with what each one paid and cost. */
export function HistoryTable({ rows }: { rows: PositionRecord[] }) {
  const { focusId, openOrder } = useApp();
  return (
    <div className="table-wrap">
      <table className="table table--rows table--fit">
        <thead>
          <tr>
            <th>Position</th>
            <th>Outcome</th>
            <th className="r hide-sm">Entry and exit</th>
            <th className="r">Profit/loss</th>
            <th className="r hide-sm">Hourly fee</th>
            <th className="r hide-sm">Profit fee</th>
            <th className="r hide-sm">Payout</th>
            <th className="hide-sm">Premium</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const st = stateOf(p);
            const owed = p.iou ? p.iou.traderOwed - p.iou.traderPaid : 0n;
            const c = p.closed;
            const l = p.liquidated;
            const open = () => openOrder(p.id);
            return (
              <tr key={p.id.toString()} tabIndex={0} data-focused={focusId === p.id || undefined} onClick={open} onKeyDown={rowKeys(open)}>
                <td>
                  <span className="inline-gap">
                    <SideBadge isLong={p.isLong} />
                    <strong>
                      {MARKETS[p.market]} {p.leverage.toString()}x
                    </strong>
                  </span>
                  <span className="cell-sub">
                    Order #{p.id.toString()}, {usdc(p.collateral)} tUSDC
                  </span>
                </td>
                <td>
                  <Badge tone={st === "Liquidated" ? "short" : "neutral"}>{st === "Cancelled" ? "Cancelled" : st}</Badge>
                  <span className="cell-sub">{c ? `At print ${c.idxCloseFill}` : l ? `At prints ${l.idx - 1} and ${l.idx}` : st === "Cancelled" ? "No fill within 120 s, full refund" : ""}</span>
                </td>
                <td className="r hide-sm">{p.fill ? `${px(p.fill.fillPx, p.market)} to ${c ? px(c.exitPx, p.market) : l ? px(l.oraclePx, p.market) : "–"}` : "–"}</td>
                <td className={`r ${c ? (c.pnl >= 0n ? "text-long" : "text-short") : l ? "text-short" : "muted"}`}>{c ? usdcSigned(c.pnl) : l ? usdcSigned(-p.collateral) : "–"}</td>
                <td className="r hide-sm">{c ? usdcFine(c.carryPaid) : "–"}</td>
                <td className="r hide-sm">{c ? usdcFine(c.winFee) : "–"}</td>
                <td className="r hide-sm">
                  {c ? usdcFine(c.payout) : l ? "0.00" : st === "Cancelled" ? usdc(p.collateral) : "–"}
                  {l && <span className="cell-sub">No liquidation fee</span>}
                  {p.iou && <span className={`cell-sub ${owed > 0n ? "text-short" : ""}`}>{owed > 0n ? `IOU ${usdcFine(owed)} still owed` : `IOU ${usdcFine(p.iou.traderOwed)} paid`}</span>}
                </td>
                <td className="hide-sm">
                  {p.breach ? (
                    <span className="text-short">
                      {usdcFine(p.breach.premiumToVault)}
                      <span className="cell-sub cell-sub--line">To the vault at print {p.breach.idx}</span>
                    </span>
                  ) : c ? (
                    <>
                      {usdcFine(c.premiumReleased)}
                      <span className="cell-sub cell-sub--line">Refunded</span>
                    </>
                  ) : (
                    "–"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Every trader's recent orders, newest first. */
function ActivityTable({ rows }: { rows: PositionRecord[] }) {
  const { address, openOrder } = useApp();
  return (
    <div className="table-wrap">
      <table className="table table--rows">
        <thead>
          <tr>
            <th>Position</th>
            <th>Trader</th>
            <th className="r">Size</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const st = stateOf(p);
            const open = () => openOrder(p.id);
            return (
              <tr key={p.id.toString()} tabIndex={0} onClick={open} onKeyDown={rowKeys(open)}>
                <td>
                  <span className="inline-gap">
                    <SideBadge isLong={p.isLong} />
                    <strong>
                      {MARKETS[p.market]} {p.leverage.toString()}x
                    </strong>
                  </span>
                  <span className="cell-sub">Order #{p.id.toString()}</span>
                </td>
                <td>{owns(p, address) ? <Badge tone="carbon">You</Badge> : short(p.trader)}</td>
                <td className="r">{usdc(p.notional, 0)} tUSDC</td>
                <td>
                  <Badge tone={st === "Open" || st === "PendingOpen" || st === "PendingClose" ? "carbon" : st === "Liquidated" ? "short" : "neutral"}>{st === "Cancelled" ? "Cancelled" : st === "PendingOpen" ? "Pending fill" : st === "PendingClose" ? "Closing" : st}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------- the advanced layout's panel

const TABS = ["positions", "history", "activity"] as const;
type Tab = (typeof TABS)[number];

/** Under the chart in the advanced layout: your positions, your history and everyone's activity. */
export function PositionsPanel() {
  const { snap, positions, address, ledgerReady } = useApp();
  const [tab, setTab] = usePref<Tab>("twoprint.tradeTab", TABS, "positions");
  const mine = positions.filter((p) => owns(p, address)).sort(newest);
  const live = mine.filter(isLive);
  const done = mine.filter((p) => !isLive(p));
  const everyone = [...positions].sort(newest).slice(0, 50);
  const signedOut = !address;

  return (
    <section className="panel holdings" aria-label="Positions and activity">
      <header className="panel__bar">
        <Tabs
          label="Positions and activity"
          idPrefix="holdings"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "positions", label: "Positions", count: live.length },
            { value: "history", label: "History", count: done.length },
            { value: "activity", label: "Activity" },
          ]}
        />
      </header>

      {snap?.user && snap.user.claimable > 0n && (
        <div className="panel__pad">
          <Deferred amount={snap.user.claimable} to={snap.user.address} />
        </div>
      )}

      <div role="tabpanel" id={`holdings-panel-${tab}`} aria-labelledby={`holdings-tab-${tab}`} className="panel__body">
        {!ledgerReady && !signedOut && <SkeletonPanel title={false} rows={3} />}
        {tab === "positions" && (ledgerReady || signedOut) &&
          (live.length === 0 ? (
            <Empty title={signedOut ? "Connect a wallet to see your positions" : "No open positions"}>{signedOut ? undefined : "Open a position in the ticket and it appears here."}</Empty>
          ) : (
            <LiveTable rows={live} />
          ))}
        {tab === "history" && (ledgerReady || signedOut) &&
          (done.length === 0 ? (
            <Empty title={signedOut ? "Connect a wallet to see your history" : "Nothing settled yet"}>{signedOut ? undefined : "Closed, liquidated and cancelled orders appear here with their fees."}</Empty>
          ) : (
            <HistoryTable rows={done} />
          ))}
        {tab === "activity" && ledgerReady && (everyone.length === 0 ? <Empty title="No orders yet" /> : <ActivityTable rows={everyone} />)}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- the basic layout's strip

/** Under the chart in the Basic layout: the positions you have open, a line each, or a line saying there are none. */
export function OpenStrip() {
  const { snap, positions, address, openOrder, ledgerReady } = useApp();
  const live = positions.filter((p) => owns(p, address) && isLive(p)).sort(newest);
  if (!ledgerReady && address) {
    return (
      <section className="panel openstrip" aria-label="Open positions">
        <header className="panel__head">
          <h2>Open positions</h2>
        </header>
        <SkeletonPanel title={false} rows={2} />
      </section>
    );
  }
  if (live.length === 0) {
    return (
      <section className="panel openstrip" aria-label="Open positions">
        <header className="panel__head">
          <h2>Open positions</h2>
        </header>
        <Empty title={address ? "No open positions" : "Connect a wallet to see your positions"}>{address ? "Open a position with the ticket and it appears here." : undefined}</Empty>
      </section>
    );
  }
  return (
    <section className="panel openstrip" aria-label="Open positions">
      <header className="panel__head">
        <h2>Open positions</h2>
        <a className="linklike" href={href("portfolio")}>
          {live.length > 3 ? `View all ${live.length}` : "Portfolio"}
        </a>
      </header>
      <ul>
        {live.slice(0, 3).map((p) => {
          const st = stateOf(p) as keyof typeof STATUS_LABEL;
          const { pnl, pnlPct, risk } = livePosition(p, snap);
          return (
            <li key={p.id.toString()}>
              <button type="button" className="orow" onClick={() => openOrder(p.id)}>
                <span className="orow__what">
                  <span className="inline-gap">
                    <SideBadge isLong={p.isLong} />
                    <strong>
                      {MARKETS[p.market]} {p.leverage.toString()}x
                    </strong>
                  </span>
                  <span className="cell-sub">
                    {st === "Open" ? `${usdc(p.notional, 0)} tUSDC` : STATUS_LABEL[st]}
                    {risk && risk.alertTier !== "SAFE" && (
                      <>
                        {" "}
                        <RiskBadge tier={risk.alertTier} />
                      </>
                    )}
                  </span>
                </span>
                <span className={`orow__pnl ${pnl === undefined ? "muted" : pnl >= 0n ? "text-long" : "text-short"}`}>
                  {pnl !== undefined ? usdcSigned(pnl) : "Pending"}
                  {pnlPct !== undefined && <span className="cell-sub">{pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Payouts the PositionManager could not push (a refused transfer) wait in claimable(account). */
export function Deferred({ amount, to }: { amount: bigint; to: Address }) {
  const { chainId, deployment: d } = useApp();
  const { run, busy, blocked } = useTx(chainId);
  return (
    <Notice
      tone="warn"
      title="You have a deferred payout"
      actions={
        <Button size="sm" disabled={!!blocked || !!busy || !d} busy={busy === "Withdraw deferred payout"} onClick={() => d && run("Withdraw deferred payout", withdrawClaimableRequest(d, to))}>
          Withdraw
        </Button>
      }
    >
      {usdcFine(amount)} tUSDC could not be sent to you when it was due (the transfer failed), so it is waiting here.
    </Notice>
  );
}
