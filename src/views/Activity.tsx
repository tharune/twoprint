import { useMemo } from "react";
import { useApp } from "../app-context";
import { TimeBars } from "../components/charts/BarsChart";
import { Skeleton, SkeletonPanel } from "../components/Skeleton";
import { Badge, Empty, PageHeader, SideBadge, Stat, TableWrap } from "../components/ui";
import { isLive, stateOf, type PositionRecord } from "../hooks/data";
import { useClock } from "../hooks/useClock";
import { MARKETS, ago, money, short, usdc } from "../lib/format";
import { HOUR, bucketEvents, bucketSize, windowFor } from "../lib/grid";

const newest = (a: PositionRecord, b: PositionRecord) => Number(b.id - a.id);

const STATUS: Record<string, string> = { PendingOpen: "Pending fill", PendingClose: "Closing" };

/** Every order on the venue, newest first, with how much was opened over time and who was liquidated. An Advanced page. */
export function Activity() {
  const { positions, address, openOrder, ledgerReady } = useApp();
  const clock = useClock();
  const all = useMemo(() => [...positions].sort(newest), [positions]);
  const recent = all.slice(0, 60);
  const liquidations = all.filter((p) => p.liquidated).slice(0, 8);
  // Position size that filled in each stretch of time, over a window that opens before the first fill and ends now.
  const volume = useMemo(() => {
    const fills = positions.filter((p) => p.fill).map((p) => ({ t: clock(p.fill!.block), v: Number(p.notional) / 1e6 }));
    if (fills.length === 0) return null;
    const win = windowFor(Math.min(...fills.map((f) => f.t)), Date.now(), 3 * HOUR);
    const size = bucketSize(win.to - win.from, 72);
    return { win, buckets: bucketEvents(fills, win.from, win.to, size) };
  }, [positions, clock]);
  const now = Date.now();
  const opened = all.filter((p) => p.fill).reduce((a, p) => a + Number(p.notional) / 1e6, 0);
  // The orders are listed by when they were placed, and say so; the liquidations are listed by when they ended.
  const row = (p: PositionRecord, key?: string, placed = false) => {
    const st = stateOf(p);
    const t = placed ? clock(p.commit.block) : clock(p.liquidated?.block ?? p.closed?.block ?? p.fill?.block ?? p.commit.block);
    const open = () => openOrder(p.id);
    return (
      <tr
        key={key ?? p.id.toString()}
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            open();
          }
        }}
      >
        <td>
          <span className="inline-gap">
            <SideBadge isLong={p.isLong} />
            <strong>
              {MARKETS[p.market]} {p.leverage.toString()}x
            </strong>
          </span>
          <span className="cell-sub">Order #{p.id.toString()}</span>
        </td>
        <td>{address && p.trader.toLowerCase() === address.toLowerCase() ? <Badge tone="carbon">You</Badge> : short(p.trader)}</td>
        <td className="r">{usdc(p.notional, 0)} tUSDC</td>
        <td>
          <Badge tone={st === "Liquidated" ? "short" : isLive(p) ? "carbon" : "neutral"}>{STATUS[st] ?? st}</Badge>
        </td>
        <td className="r hide-sm muted">{ago(now - t)} ago</td>
      </tr>
    );
  };
  return (
    <div className="wrap">
      <PageHeader title="Activity" lede="Every order on the venue, newest first." />
      <div className="stackp">
        <div className="readings">
          <Stat label="Orders" value={ledgerReady ? all.length : <Skeleton w="3rem" h="1.5rem" />} sub={ledgerReady ? `${all.filter(isLive).length} open now` : undefined} />
          <Stat label="Opened" value={ledgerReady ? `${money(opened, 0)} tUSDC` : <Skeleton w="6rem" h="1.5rem" />} sub="Position size, all orders" />
          <Stat label="Liquidations" value={ledgerReady ? all.filter((p) => p.liquidated).length : <Skeleton w="2rem" h="1.5rem" />} sub="Positions closed by two price updates past their level" />
        </div>

        <section className="panel ppanel" aria-label="Position size opened over time">
          <header className="ppanel__head">
            <div>
              <h2>Opened over time</h2>
              <p>Position size that filled in each stretch of time, in tUSDC</p>
            </div>
          </header>
          <TimeBars
            mode="advanced"
            buckets={volume?.buckets ?? []}
            range={volume ? { from: Math.floor(volume.win.from / 1000), to: Math.floor(volume.win.to / 1000) } : undefined}
            tone="brand"
            height={260}
            loading={!ledgerReady}
            format={(v) => `${money(v, 0)} tUSDC`}
            axisFormat={(v) => money(v, 0)}
            label="Position size opened over time"
            empty="Bars appear here once an order has filled."
          />
        </section>

        <section className="panel" aria-label="Orders">
          <header className="panel__head">
            <h2>Orders</h2>
            <span className="muted">{!ledgerReady ? "" : all.length > recent.length ? `Latest ${recent.length} of ${all.length}` : `${all.length} in all`}</span>
          </header>
          {!ledgerReady ? (
            <SkeletonPanel title={false} rows={5} />
          ) : recent.length === 0 ? (
            <Empty title="No orders yet">Orders appear here as soon as anyone opens one.</Empty>
          ) : (
            <TableWrap className="panel__body" label="Orders">
              <table className="table table--rows table--fit">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Trader</th>
                    <th className="r">Size</th>
                    <th>Status</th>
                    <th className="r hide-sm">Placed</th>
                  </tr>
                </thead>
                <tbody>{recent.map((p) => row(p, undefined, true))}</tbody>
              </table>
            </TableWrap>
          )}
        </section>

        {liquidations.length > 0 && (
          <section className="panel" aria-label="Recent liquidations">
            <header className="panel__head">
              <h2>Recent liquidations</h2>
            </header>
            <TableWrap className="panel__body" label="Recent liquidations">
              <table className="table table--rows table--fit">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Trader</th>
                    <th className="r">Size</th>
                    <th>Status</th>
                    <th className="r hide-sm">When</th>
                  </tr>
                </thead>
                <tbody>{liquidations.map((p) => row(p, `liq-${p.id}`))}</tbody>
              </table>
            </TableWrap>
          </section>
        )}
      </div>
    </div>
  );
}
