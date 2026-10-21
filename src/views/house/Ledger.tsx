import { useApp } from "../../app-context";
import { SkeletonList } from "../../components/Skeleton";
import { Badge, Button, Check, Receipt, ReceiptRow, TxLink } from "../../components/ui";
import { useTx } from "../../hooks/tx";
import { usdc, usdcSigned } from "../../lib/format";
import { calculateSurplusPool, houseTradingPnl } from "../../lib/netsplit";
import { claimIousRequest } from "../../lib/protocol";
import { navigate } from "../../lib/router";

const k = (v: bigint) => usdc(v, 0);
const MAX = (1n << 256n) - 1n;
const utc = (t: bigint) => new Date(Number(t) * 1000).toISOString().slice(0, 16).replace("T", " ") + " UTC";

/** The vault's books: what it took in and paid out, whether they add up, and each settlement as it happened. */
export function LedgerPanel() {
  const { chainId, deployment: dep, snap, ledger, ledgerReady } = useApp();
  const { run, busy, blocked } = useTx(chainId);
  if (!snap) return null;
  const v = snap.vault;
  const pm = snap.pm;
  const vaultEvs = ledger?.vault ?? [];
  const paidOut = ledger?.paidOut ?? [];
  const seedOut = v.seedDeposited - v.seedWithdrawn;
  const pnl = houseTradingPnl(v);
  const reconciles = seedOut + pnl === v.equity;
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const latched = v.closeOnlyUntil > nowSec;
  const iou = pm.totalIou;
  const outPct = (Number(v.maxOutflowBpsPerHour) / 100).toFixed(0);
  const seedLock = iou > 0n ? "Locked while IOUs are owed." : latched ? `Locked while the breaker is latched, until ${utc(v.closeOnlyUntil)}.` : null;
  const surplus = calculateSurplusPool({ equity: v.equity, seedDeposited: v.seedDeposited, seedWithdrawn: v.seedWithdrawn, weeklyRealizedTradingPnl: pnl > 0n ? pnl : 0n });

  return (
    <div className="cols2">
      <section className="panel stackp" aria-labelledby="ledger-books">
        <header className="panel__head">
          <h2 id="ledger-books">Vault ledger</h2>
        </header>
        <div className="panel__body stackp">
          <p className="muted">The team can only take back its seed.</p>
          <Receipt label="Vault ledger">
            <ReceiptRow
              label="Seed outstanding"
              tone={seedLock ? "short" : undefined}
              note={seedLock ?? `Withdrawable by the team only up to the seed and only above the capital the open book needs (${pm.requiredCapital === MAX ? "unbounded" : k(pm.requiredCapital)}).`}
            >
              {usdc(seedOut, 6)}
            </ReceiptRow>
            <ReceiptRow label="Premiums received" note="Two-print premiums, paid at the first breach print">
              {usdc(v.premiumsReceived, 6)}
            </ReceiptRow>
            <ReceiptRow label="Trading inflow" note="Trader losses and worse-of fill differences">
              {usdc(v.tradingInflow, 6)}
            </ReceiptRow>
            <ReceiptRow label="Trading outflow" note="Trader profits paid">
              {usdc(v.tradingOutflow, 6)}
            </ReceiptRow>
            <ReceiptRow label="House trading P&L" total tone={pnl >= 0n ? "long" : "short"}>
              {usdcSigned(pnl, 6)}
            </ReceiptRow>
            {iou > 0n && (
              <ReceiptRow
                label="Outstanding IOUs"
                tone="short"
                note={
                  <>
                    Winners the vault could not pay in full, or above the rolling {outPct}% per 60 minutes outflow limit. Paid oldest first. Opens stay paused until they are.{" "}
                    <Button size="sm" disabled={!!blocked || !!busy || !dep} busy={busy === "Pay IOUs"} onClick={() => dep && run("Pay IOUs", claimIousRequest(dep, 10n))}>
                      Pay IOUs
                    </Button>
                  </>
                }
              >
                {usdc(iou, 6)}
              </ReceiptRow>
            )}
          </Receipt>
          <Check ok={reconciles}>{reconciles ? "Seed plus house P&L equals vault equity." : "Seed plus house P&L differs from vault equity."}</Check>
          <p className="muted">
            Rolling outflow room: {usdc(v.outflowRoom, 2)} tUSDC. The vault pays at most {outPct}% of its equity in any 60 minutes, and that limit is immutable.
          </p>
          <div className="aside">
            <div>
              <strong>Net Split pool this week</strong>
              <p className="muted">{usdc(surplus.poolBudget, 2)} tUSDC, from the house trading P&amp;L above the seed and a $10,000 floor.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => navigate("house", "joint/net-split")}>
              Open Net Split
            </Button>
          </div>
        </div>
      </section>

      <section className="panel stackp" aria-labelledby="ledger-settlements">
        <header className="panel__head">
          <h2 id="ledger-settlements">Recent settlements</h2>
        </header>
        <div className="panel__body">
          {!ledgerReady ? (
            <SkeletonList rows={4} />
          ) : (
            <ul className="evlist">
              {vaultEvs.length === 0 && <li className="muted">No settlements yet.</li>}
              {vaultEvs
                .slice(-10)
                .reverse()
                .map((e) => {
                  const po = paidOut.find((x) => x.tx === e.tx && x.positionId === e.positionId);
                  return (
                    <li key={`${e.tx}-${e.positionId}-${e.vaultDelta}`}>
                      <Badge tone={e.premium > 0n ? "short" : e.vaultDelta > 0n ? "long" : "warn"}>{e.premium > 0n ? "Premium" : e.vaultDelta > 0n ? "In" : "Out"}</Badge>
                      <span className="muted">Order #{e.positionId.toString()}</span>
                      <strong>
                        {usdcSigned(e.vaultDelta, 6)}
                        {po && po.paid < po.requested && <span className="text-short"> of {usdc(po.requested, 2)} requested</span>}
                      </strong>
                      <TxLink chainId={chainId} hash={e.tx} />
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
