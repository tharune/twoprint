import { useMemo, useState } from "react";
import { useApp } from "../../app-context";
import { Badge, Button, Empty, SideBadge, TableWrap } from "../../components/ui";
import { stateOf, type PositionRecord } from "../../hooks/data";
import { MARKETS, ago, money, usdc } from "../../lib/format";
import { netOf, settledBlock } from "../../lib/series";

/** When an order ended: the block that settled it, or the one that cancelled it (a voided open has no settlement). */
const endedAt = (p: PositionRecord): bigint => settledBlock(p) ?? p.cancelled?.block ?? p.commit.block;

/** The latest settled positions, one line each: what it was, how it ended and what it made or lost. Basic's whole history. */
export function Results({ done, clock, limit = 8 }: { done: PositionRecord[]; clock: (b: bigint) => number; limit?: number }) {
  const { openOrder } = useApp();
  const [showAll, setShowAll] = useState(false);
  const rows = useMemo(() => [...done].sort((a, b) => Number(endedAt(b) - endedAt(a))).slice(0, showAll ? done.length : limit), [done, limit, showAll]);
  const now = Date.now();
  return (
    <section className="panel" aria-label="Recent results">
      <header className="panel__head">
        <h2>Recent results</h2>
        {done.length > limit ? (
          <Button size="sm" variant="secondary" onClick={() => setShowAll((v) => !v)}>
            {showAll ? `Latest ${limit}` : `Show all ${done.length}`}
          </Button>
        ) : (
          <span className="muted">{done.length > 0 ? `${done.filter((p) => !p.cancelled).length} settled${done.some((p) => p.cancelled) ? `, ${done.filter((p) => p.cancelled).length} cancelled` : ""}` : ""}</span>
        )}
      </header>
      {rows.length === 0 ? (
        <Empty title="Nothing settled yet">Closed and liquidated positions appear here with what each made or lost.</Empty>
      ) : (
        <TableWrap className="panel__body" label="Recent results">
          <table className="table table--rows table--fit">
            <thead>
              <tr>
                <th>Position</th>
                <th>Outcome</th>
                <th className="r">Result</th>
                <th className="r hide-sm">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const st = stateOf(p);
                const net = Number(netOf(p) ?? 0n) / 1e6;
                const t = clock(endedAt(p));
                const open = () => openOrder(p.id);
                return (
                  <tr
                    key={p.id.toString()}
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
                      <span className="cell-sub">
                        Order #{p.id.toString()}, {usdc(p.collateral)} tUSDC
                      </span>
                    </td>
                    <td>
                      <Badge tone={st === "Liquidated" ? "short" : "neutral"}>{st}</Badge>
                    </td>
                    <td className={`r ${net > 0 ? "text-long" : net < 0 ? "text-short" : "muted"}`}>{st === "Cancelled" ? "Refunded" : money(net, 2, true)}</td>
                    <td className="r hide-sm muted">{ago(now - t)} ago</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      )}
    </section>
  );
}
