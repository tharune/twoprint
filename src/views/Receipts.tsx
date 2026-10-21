import { useMemo, useState } from "react";
import { useApp } from "../app-context";
import { Badge, Button, Empty, Segmented, SideBadge, TableWrap } from "../components/ui";
import { iouOutstanding, isLive, stateOf, type PositionRecord } from "../hooks/data";
import { MARKETS, px, usdc, usdcFine } from "../lib/format";
import { evaluateSurvivalReceipt, type SurvivalReceipt } from "../lib/receipt";
import { summarizeReceipts } from "../lib/totals";

type Status = "all" | "closed" | "liquidated" | "survived";

const CSV_HEADERS = [
  "PositionId",
  "Trader",
  "Market",
  "Direction",
  "CollateralUSDC",
  "Leverage",
  "NotionalUSDC",
  "ReservedPremiumUSDC",
  "EntryPrice",
  "ExitPrice",
  "RealizedPnLUSDC",
  "WinFeeUSDC",
  "CarryPaidUSDC",
  "NetPayoutUSDC",
  "NetResultUSDC",
  "IouOwedToTraderUSDC",
  "State",
  "WickSurvived",
  "CommitTx",
  "FillTx",
  "CloseOrLiquidationTx",
];

const six = (v: bigint) => (Number(v) / 1e6).toFixed(6);
/** What a settled position cost or earned the trader: the payout (nothing if liquidated) against all collateral posted. Undefined while live or voided. */
const netOf = (p: PositionRecord): bigint | undefined => (p.closed ? p.closed.payout - p.collateral : p.liquidated ? -p.collateral : undefined);

/**
 * Every position you have settled, itemized: the price move, the fees, the payout and the net result, with a CSV of it.
 * Survival receipts are derived from the prints this page holds (the last 6,000 per market), so the count of spikes survived
 * is a rolling window, not a total.
 */
export function ReceiptsPanel() {
  const { positions, prints, ledger, address, openOrder } = useApp();
  const [status, setStatus] = useState<Status>("all");
  const fees = ledger?.fees ?? [];
  const mine = useMemo(() => positions.filter((p) => !!address && p.trader.toLowerCase() === address.toLowerCase() && !isLive(p)), [positions, address]);

  const heldHours = useMemo(() => Math.min(...prints.map((a) => (a.length > 1 ? (a[a.length - 1].srcTimeMs - a[0].srcTimeMs) / 3_600_000 : 0))), [prints]);
  const receipts = useMemo(() => {
    const map = new Map<bigint, SurvivalReceipt | null>();
    for (const p of mine) map.set(p.id, evaluateSurvivalReceipt(p, prints[p.market] ?? []));
    return map;
  }, [mine, prints]);

  const rows = useMemo(() => {
    let list = [...mine];
    if (status === "closed") list = list.filter((p) => !!p.closed);
    else if (status === "liquidated") list = list.filter((p) => !!p.liquidated);
    else if (status === "survived") list = list.filter((p) => !!receipts.get(p.id));
    return list.sort((a, b) => Number(b.id - a.id));
  }, [mine, status, receipts]);

  // Fee and payout amounts on PositionClosed are what the contract computed, not what was paid: a vault shortfall turns the
  // unpaid part into an IOU. So the fee totals sum FeeCollected (what the FeeRouter received), and the result includes liquidations.
  const totals = useMemo(() => {
    const t = summarizeReceipts(rows, fees);
    let survived = 0;
    for (const p of rows) if (receipts.get(p.id)) survived++;
    return { ...t, survived };
  }, [rows, fees, receipts]);

  const exportCsv = () => {
    const lines = rows.map((p) => {
      const c = p.closed;
      return [
        p.id.toString(),
        p.trader,
        MARKETS[p.market],
        p.isLong ? "LONG" : "SHORT",
        six(p.collateral),
        p.leverage.toString(),
        six(p.notional),
        six(p.premium),
        p.fill ? px(p.fill.fillPx, p.market, 1) : "",
        c ? px(c.exitPx, p.market, 1) : "",
        c ? six(c.pnl) : "",
        c ? six(c.winFee) : "",
        c ? six(c.carryPaid) : "",
        c ? six(c.payout) : "",
        netOf(p) !== undefined ? six(netOf(p)!) : "",
        p.iou ? six(p.iou.traderOwed - p.iou.traderPaid) : "",
        stateOf(p),
        receipts.get(p.id) ? "YES" : "NO",
        p.commit.tx,
        p.fill?.tx ?? "",
        c?.tx ?? p.liquidated?.tx ?? "",
      ]
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(",");
    });
    const blob = new Blob([[CSV_HEADERS.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `twoprint-receipts-${address ? address.slice(0, 8) : "all"}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="stackp">
      {totals.settled > 0 && (
        <p className="muted">
          Fees paid on {totals.settled} settled position{totals.settled === 1 ? "" : "s"}: {usdcFine(totals.winFeeReceived)} tUSDC in profit fees and {usdcFine(totals.carryReceived)} tUSDC in hourly fees.
          {totals.survived > 0 && ` One price update crossed your liquidation price ${totals.survived === 1 ? "once" : `${totals.survived} times`} and you stayed open (over the last ${heldHours.toFixed(1)} h).`}
        </p>
      )}

      {totals.iouPayout > 0n && <p className="muted">Your net result includes {usdc(totals.iouPayout, 2)} tUSDC that the vault still owes you as an IOU, an amount it pays as funds free up.</p>}

      <div className="toolbar">
        <Segmented
          label="Outcome"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: `All ${mine.length}` },
            { value: "closed", label: "Closed" },
            { value: "liquidated", label: "Liquidated" },
            { value: "survived", label: "Survived a spike" },
          ]}
        />
        <Button variant="secondary" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
          Export CSV
        </Button>
      </div>

      {rows.length === 0 ? (
        <Empty title={mine.length === 0 ? "Nothing settled yet" : "No positions match"}>{mine.length === 0 ? "Closed, liquidated and cancelled orders appear here with their fees." : "Change the filter to see the rest."}</Empty>
      ) : (
        <section className="panel" aria-label="History">
          <TableWrap className="panel__body" label="Settled positions">
            <table className="table table--rows">
              <thead>
                <tr>
                  <th>Position</th>
                  <th className="r">Entry</th>
                  <th className="r">Exit</th>
                  <th className="r">Gain/loss</th>
                  <th className="r">Profit fee</th>
                  <th className="r">Hourly fee</th>
                  <th className="r">Payout</th>
                  <th className="r">Net result</th>
                  <th>Spike</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const st = stateOf(p);
                  const sr = receipts.get(p.id);
                  const c = p.closed;
                  const net = netOf(p);
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
                      <td className="r">{p.fill ? px(p.fill.fillPx, p.market, 1) : "–"}</td>
                      <td className="r">{c ? px(c.exitPx, p.market, 1) : "–"}</td>
                      <td className={`r ${c ? (c.pnl >= 0n ? "text-long" : "text-short") : "muted"}`}>{c ? `${c.pnl >= 0n ? "+" : "−"}${usdc(c.pnl < 0n ? -c.pnl : c.pnl)}` : "–"}</td>
                      <td className="r">{c ? usdcFine(c.winFee) : "–"}</td>
                      <td className="r">{c ? usdcFine(c.carryPaid) : "–"}</td>
                      <td className="r">
                        {c ? usdc(c.payout) : "–"}
                        {p.iou && iouOutstanding(p.iou) > 0n && <span className="cell-sub text-short">IOU {usdc(iouOutstanding(p.iou), 2)} still owed</span>}
                      </td>
                      <td className={`r ${net === undefined ? "muted" : net >= 0n ? "text-long" : "text-short"}`}>{net === undefined ? "–" : `${net >= 0n ? "+" : "−"}${usdc(net < 0n ? -net : net)}`}</td>
                      <td>
                        {sr ? (
                          <Badge tone="carbon" title={`One price update crossed your liquidation price at print ${sr.breachPrint.idx}, ${sr.beyondBp.toFixed(1)} bp beyond it, and you stayed open`}>
                            Survived
                          </Badge>
                        ) : p.breach ? (
                          <Badge tone="warn" title="A price update went beyond your liquidation price">
                            Crossed
                          </Badge>
                        ) : (
                          <span className="muted">–</span>
                        )}
                      </td>
                      <td>
                        <Badge tone={st === "Liquidated" ? "short" : st === "Open" || st === "PendingOpen" || st === "PendingClose" ? "carbon" : "neutral"}>{st}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        </section>
      )}
    </div>
  );
}
