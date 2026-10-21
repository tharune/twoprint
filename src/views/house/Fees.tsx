import { zeroAddress } from "viem";
import { useApp } from "../../app-context";
import { SkeletonList } from "../../components/Skeleton";
import { Badge, Check, Empty, Receipt, ReceiptRow, Stat, TableWrap, TxLink } from "../../components/ui";
import { explorerAddress } from "../../config/chains";
import { useClock } from "../../hooks/useClock";
import { ago, fixed, short, usdc, usdcFine } from "../../lib/format";
import { receivedLabelFor } from "../../lib/legspends";
import { enabledLegs, legLabel, shareLabel, splitPhrase } from "../../lib/split";

const FEE_TYPE = ["Profit fee", "Hourly fee"];
const LEG_SPENT = ["Spent on the TWOPRINT buyback", "Spent on the KNTQ buyback", "Paid to team/ops"];

/** DEMO tokens (18 decimals) with 6 decimals under 0.01, so the first live burn of 0.008973 does not read as 0.009 and a smaller one as 0. */
const demo = (v: bigint) => fixed(v, 18, v > 0n && v < 10n ** 16n ? 6 : 2);

/**
 * The fees you pay: what the FeeRouter holds and how that adds up on the left; the latest fees and every payment out of it on the
 * right. None of it is house P&L.
 */
export function FeesPanel() {
  const { chainId, deployment: dep, snap, ledger, ledgerReady } = useApp();
  const clock = useClock();
  if (!snap) return null;
  const split = snap.fees.split;
  const legacy = !split;
  const f = snap.fees;
  const pm = snap.pm;
  const fees = ledger?.fees ?? [];
  const buybacks = ledger?.buybacks ?? [];
  const legSpends = ledger?.legSpends ?? [];
  const feeReconciles = f.balance === f.totalFeesAccrued - f.totalFeesSpent;
  const adapterWired = f.adapter !== zeroAddress;
  const adapterUrl = adapterWired ? explorerAddress(chainId, f.adapter) : null;
  const received = receivedLabelFor(demo);
  const now = Date.now();
  const legNote = (leg: number) => {
    if (!split) return null;
    const share = `${shareLabel(split.mask)} of fees: ${usdc(split.accrued[leg], 6)} so far.`;
    if (leg === 0) return `${share} ${adapterWired ? (dep?.DemoToken ? "DEMO bought on the DEMO/tUSDC pool and burned." : "Swapped for the token and burned.") : "No buyback adapter is wired on this deployment, so it accrues."}`;
    if (leg === 1) return `${share} ${split.kntqAdapter !== zeroAddress ? "Swapped for KNTQ." : "No KNTQ venue is wired, so it accrues."}`;
    return `${share} Paid only to ${short(split.opsRecipient)}, fixed at deploy.`;
  };

  return (
    <div className="cols2">
      <section className="panel stackp" aria-labelledby="fees-held">
        <header className="panel__head">
          <h2 id="fees-held">Fees you pay</h2>
        </header>
        <div className="panel__body stackp">
          <p className="muted">{split ? "Held by the FeeRouter. Each leg can spend only its own share, and only to its own destination." : "Held by the FeeRouter. The only way out is a buyback."}</p>
          <Stat large label={split ? "Held, not yet spent" : "Held for buybacks"} value={`${usdc(f.balance, 6)} tUSDC`} />
          <Receipt label="Fee ledger">
            <ReceiptRow label="Profit fees collected" note={`${(pm.winFeeBps / 100).toFixed(0)}% of profit`}>
              {usdc(f.win, 6)}
            </ReceiptRow>
            <ReceiptRow label="Hourly fees collected" note={`${(pm.carryPerHourE8 / 1e6).toFixed(4)}% of position size per hour, paid only from positive equity`}>
              {usdc(f.borrow, 6)}
            </ReceiptRow>
            {split ? (
              <>
                {enabledLegs(split.mask).map((leg) => (
                  <ReceiptRow key={leg} label={LEG_SPENT[leg]} note={legNote(leg)}>
                    {usdc(split.spent[leg], 6)}
                  </ReceiptRow>
                ))}
                <ReceiptRow label="Spent, all legs" total>
                  {usdc(f.totalFeesSpent, 6)}
                </ReceiptRow>
              </>
            ) : (
              <ReceiptRow
                label="Spent on buybacks"
                note={
                  adapterWired ? (
                    <>
                      {buybacks.length} buyback{buybacks.length === 1 ? "" : "s"}: {dep?.DemoToken ? "DEMO bought on the DEMO/tUSDC pool and burned" : "swapped and burned"}, via{" "}
                      {adapterUrl ? (
                        <a className="txlink" href={adapterUrl} target="_blank" rel="noreferrer">
                          {short(f.adapter)}
                        </a>
                      ) : (
                        <code title={f.adapter}>{short(f.adapter)}</code>
                      )}
                      .
                    </>
                  ) : (
                    "No buyback adapter is wired on this deployment, so fees accrue."
                  )
                }
              >
                {usdc(f.totalFeesSpent, 6)}
              </ReceiptRow>
            )}
          </Receipt>
          <Check ok={feeReconciles}>{feeReconciles ? "Balance equals fees collected minus fees spent." : "Balance differs from fees collected minus fees spent. Someone may have sent tokens to the router directly."}</Check>
          <p className="muted">
            {split ? "Everything the FeeRouter pays out comes from fees you pay." : "Buybacks are funded only by fees you pay."} The house&rsquo;s trading P&amp;L never enters the FeeRouter.
          </p>
        </div>
      </section>

      <div className="stackp">
        <section className="panel stackp" aria-labelledby="fees-recent">
          <header className="panel__head">
            <h2 id="fees-recent">Recent fees</h2>
          </header>
          <div className="panel__body">
            {!ledgerReady ? (
              <SkeletonList rows={4} />
            ) : (
              <ul className="evlist">
                {fees.length === 0 && <li className="muted">No fees yet. They arrive only when a position closes.</li>}
                {fees
                  .slice(-10)
                  .reverse()
                  .map((e) => (
                    <li key={`${e.tx}-${e.positionId}-${e.feeType}`}>
                      <Badge tone={e.feeType === 0 ? "carbon" : "neutral"}>{FEE_TYPE[e.feeType]}</Badge>
                      <span className="muted">Order #{e.positionId.toString()}</span>
                      <strong>{usdc(e.amount, 6)}</strong>
                      <TxLink chainId={chainId} hash={e.tx} />
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </section>

        <section className="panel stackp" aria-labelledby="fees-spent">
          <header className="panel__head">
            <h2 id="fees-spent">{legacy ? "Buybacks" : "Where fees went"}</h2>
          </header>
          <div className="panel__body stackp">
            <p className="muted">
              {split ? `Every payment out of the FeeRouter, by leg. Fees go to ${splitPhrase(split.mask)}. A buyback swaps its share for a token; team/ops is paid to an address fixed at deploy.` : "Each buyback swaps fees for the token and burns it."}
            </p>
            {!ledgerReady ? (
              <SkeletonList rows={3} />
            ) : legSpends.length === 0 ? (
              legacy ? (
                <Empty title="No buybacks yet">Fees accrue in the FeeRouter until the executor runs a buyback.</Empty>
              ) : (
                <Empty title="Nothing spent yet">Fees accrue in the FeeRouter until a leg spends its share.</Empty>
              )
            ) : (
              <TableWrap label="Fee payments by leg">
                <table className="table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Transaction</th>
                      {!legacy && (
                        <>
                          <th>Leg</th>
                          <th>Paid to</th>
                        </>
                      )}
                      <th className="r">Spent (tUSDC)</th>
                      <th className="r">{legacy ? "Burned (DEMO)" : "Received"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {legSpends.map((s, i) => (
                      <tr key={`${s.tx}-${i}`}>
                        <td className="muted">{ago(now - clock(s.block))} ago</td>
                        <td>
                          <TxLink chainId={chainId} hash={s.tx} />
                        </td>
                        {!legacy && (
                          <>
                            <td>{legLabel(s.leg)}</td>
                            <td>{short(s.to)}</td>
                          </>
                        )}
                        <td className="r">{usdcFine(s.amount)}</td>
                        <td className="r">{legacy ? (s.out === null ? "–" : demo(s.out)) : received(s)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
