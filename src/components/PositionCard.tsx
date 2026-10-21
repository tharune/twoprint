import { useApp } from "../app-context";
import { iouOutstanding, stateOf, useLivePosition, useNow, type PositionRecord, type PrintEv, type StateName } from "../hooks/data";
import { useTx } from "../hooks/tx";
import { computeLiquidationDistance } from "../lib/alerts";
import { feedView } from "../lib/feed";
import { bp, diffBp, e8ToBp, px, usdc, usdcFine, usdcSigned } from "../lib/format";
import { adjMid, markPnl, worseOf } from "../lib/math";
import { FILL_AFTER_MS, LIQ_COPY, MAX_FILL_DELAY_SEC, TIMING_COPY, VOID_AFTER_SEC, cancelExpiredRequest, claimIousRequest, fillSentence } from "../lib/protocol";
import { evaluateSurvivalReceipt, levelAt, levelNow, type SurvivalReceipt } from "../lib/receipt";
import { FillPrice, Results, RiskMeter } from "./OrderViz";
import { SettleButton } from "./OrderActions";
import { Button, Disclosure, Notice, Stat, TxLink } from "./ui";

/** Earliest print at index >= fromIdx whose source time is >= ms (PriceRing.firstPrintAtOrAfter), from the ledger. */
function firstQualifying(prints: PrintEv[], fromIdx: number, ms: number) {
  return prints.find((x) => x.idx >= fromIdx && x.srcTimeMs >= ms);
}

/** The state an order is in, as the dialog's header names it. */
export const ORDER_STATUS: Record<StateName, { label: string; tone: "carbon" | "long" | "short" | "neutral" }> = {
  None: { label: "None", tone: "neutral" },
  PendingOpen: { label: "Pending fill", tone: "carbon" },
  Open: { label: "Open", tone: "long" },
  PendingClose: { label: "Closing", tone: "carbon" },
  Closed: { label: "Closed", tone: "neutral" },
  Liquidated: { label: "Liquidated", tone: "short" },
  Cancelled: { label: "Cancelled", tone: "neutral" },
};

/** An order from the moment it is placed to its close: where it is now, what it cost or earned, and the evidence for each step. */
export function OrderDetails({ p }: { p: PositionRecord }) {
  const st = stateOf(p);
  return st === "PendingOpen" ? <Pending p={p} /> : st === "Cancelled" ? <Voided p={p} /> : <Filled p={p} />;
}

function Pending({ p }: { p: PositionRecord }) {
  const { chainId, deployment: d, snap, prints } = useApp();
  const now = useNow(500);
  const live = useLivePosition(chainId, p.id).data;
  const { run, busy, blocked } = useTx(chainId);
  const commitTs = live ? Number(live.commitTs) : null;
  const latest = snap ? snap.markets[p.market].count - 1 : p.idxCommit;
  const earliest = p.idxCommit + p.fence;
  const minMs = commitTs !== null ? commitTs * 1000 + FILL_AFTER_MS : Infinity;
  const q = commitTs !== null ? firstQualifying(prints[p.market], earliest, minMs) : undefined;
  const fillIdx = q ? q.idx : earliest;
  const willVoid = !!q && commitTs !== null && q.srcTimeMs > commitTs * 1000 + MAX_FILL_DELAY_SEC * 1000;
  const age = commitTs !== null ? Math.max(0, (now - commitTs * 1000) / 1000) : 0;
  // cancelExpired voids when no qualifying print exists after VOID_AFTER_SEC, or when the only one is late (> 120 s).
  const expired = commitTs !== null && ((!q && now / 1000 > commitTs + VOID_AFTER_SEC) || willVoid);
  const slots = Array.from({ length: fillIdx - p.idxCommit + 1 }, (_, k) => p.idxCommit + k);
  const at = (i: number) => prints[p.market].find((x) => x.idx === i);
  const left = Math.max(0, VOID_AFTER_SEC - age);

  return (
    <div className="odetail">
      <ol className="ladder" aria-label="Price updates this order waits for">
        {slots.map((i, k) => {
          const pr = at(i);
          const done = i <= latest;
          const tooEarly = !!pr && commitTs !== null && k >= p.fence && pr.srcTimeMs < minMs; // before the fence index the fence skips it, not the 1 s rule
          const what =
            k === 0
              ? "The latest price update when you ordered"
              : i === fillIdx
                ? q
                  ? willVoid
                    ? `The first update that qualifies, but it came more than ${MAX_FILL_DELAY_SEC} s after you ordered`
                    : "Your fill. It qualifies by number and by time."
                  : `Price update ${Math.min(k, p.fence)}: the earliest your order can fill`
                : tooEarly
                  ? `Update ${k} came under 1 s after you ordered, so it is skipped`
                  : `Price update ${k}`;
          return (
            <li key={i} className="rung" data-done={done} data-fill={i === fillIdx} data-first={k === 0}>
              <span className="rung__dot" aria-hidden="true" />
              <span className="rung__text">
                <b>Print {i}</b>
                <span>{what}</span>
              </span>
              <span className="rung__px">{pr ? px(pr.oraclePx, p.market) : done ? "On-chain" : "Waiting"}</span>
            </li>
          );
        })}
      </ol>
      <p className="position__note">
        Ordered {commitTs !== null ? `${age.toFixed(1)} s ago ` : ""}in block {p.commit.block.toString()} <TxLink chainId={chainId} hash={p.commit.tx} />. The latest is print {latest}.{" "}
        {willVoid
          ? `The earliest qualifying update came more than ${MAX_FILL_DELAY_SEC} s after you ordered, so settling cancels the order with a full refund.`
          : q
            ? "The fill price exists, so anyone can settle it now."
            : snap && feedView(snap, now).state === "stale"
              ? `Waiting for price update ${p.fence}. The price feed has stopped, so nothing can fill this order until it resumes. If no update qualifies, anyone can cancel it after ${VOID_AFTER_SEC} s with a full refund.`
              : `Waiting for price update ${p.fence}. They come every few seconds. The fill price is not known yet.`}
      </p>

      <section className="odetail__section" aria-label="If nothing fills">
        <h3>If nothing fills</h3>
        <div
          className="countdown"
          role="progressbar"
          aria-label="Time until anyone can cancel this order"
          aria-valuemin={0}
          aria-valuemax={VOID_AFTER_SEC}
          aria-valuenow={Math.round(Math.min(VOID_AFTER_SEC, age))}
        >
          <span style={{ width: `${Math.min(100, (age / VOID_AFTER_SEC) * 100)}%` }} />
        </div>
        {!q && commitTs !== null && (
          <p className="position__note muted">
            If no qualifying update arrives, anyone can cancel this order after {VOID_AFTER_SEC} s ({left.toFixed(0)} s left). A fill more than {MAX_FILL_DELAY_SEC} s after you ordered cancels it too.
          </p>
        )}
        <div className="actions">
          <SettleButton id={p.id} highlight={!!q} />
          <Button
            variant="secondary"
            disabled={!!blocked || !!busy || !d || !expired}
            busy={busy === `Cancel #${p.id}`}
            title={expired ? "Anyone can do this. Full refund, the same outcome as settling." : `Available if the qualifying fill is later than ${MAX_FILL_DELAY_SEC} s, or ${VOID_AFTER_SEC} s after you ordered with none.`}
            onClick={() => d && run(`Cancel #${p.id}`, cancelExpiredRequest(d, p.id))}
          >
            Cancel order
          </Button>
        </div>
      </section>
    </div>
  );
}

function Voided({ p }: { p: PositionRecord }) {
  const { chainId } = useApp();
  return (
    <div className="odetail">
      <p>
        No price update qualified to fill this order in time: the earliest one came more than {MAX_FILL_DELAY_SEC} s after you ordered, or none came within {VOID_AFTER_SEC} s. The order was cancelled and the full {usdc(p.collateral)} tUSDC, premium included, went back to you.
      </p>
      <Results items={[{ label: "Returned to you", value: `${usdc(p.collateral)} tUSDC`, note: "Collateral and premium, in full" }]} />
      <p className="position__note muted">
        Ordered at print {p.idxCommit} <TxLink chainId={chainId} hash={p.commit.tx} />, cancelled <TxLink chainId={chainId} hash={p.cancelled?.tx} />. The result follows from the public price record.
      </p>
    </div>
  );
}

function Filled({ p }: { p: PositionRecord }) {
  const { chainId, snap, prints } = useApp();
  const f = p.fill!;
  const m = p.market;
  const live = useLivePosition(chainId, p.id).data;
  const commitTs = live ? Number(live.commitTs) : null;
  const gap = diffBp(f.midPx, f.oraclePx);
  const basisBp = e8ToBp(f.basisEwmaE8);
  const adj = adjMid(f.oraclePx, f.midPx, BigInt(f.basisEwmaE8));
  const adjBp = diffBp(f.fillPx, f.oraclePx);
  const maxAdj = p.terms ? p.terms.maxFillAdjE8 : snap?.pm.maxFillAdjE8;
  const local = maxAdj !== undefined ? worseOf(f.oraclePx, f.midPx, BigInt(f.basisEwmaE8), p.isLong, BigInt(maxAdj)) : null;
  const bookWon = f.fillPx !== f.oraclePx;
  const commitPrint = prints[m].find((x) => x.idx === p.idxCommit);
  const fillPrint = prints[m].find((x) => x.idx === f.idxFill);
  const extra = f.idxFill - (p.idxCommit + p.fence);
  const survival = evaluateSurvivalReceipt(p, prints[m]);
  const latest = snap?.markets[m]?.latest;
  const isLive = !p.closed && !p.liquidated;
  const margin = p.collateral - p.premium;
  const risk =
    latest && isLive
      ? computeLiquidationDistance({ oraclePx: latest.oraclePx, entryPx: f.fillPx, liqPx: levelNow(p)!, margin, notional: p.notional, isLong: p.isLong })
      : undefined;
  const c = p.closed;
  const l = p.liquidated;

  const pnl = isLive && latest ? markPnl(f.fillPx, latest.oraclePx, p.notional, p.isLong) : undefined;
  const pnlPct = pnl !== undefined && margin > 0n ? (Number(pnl) / Number(margin)) * 100 : undefined;

  return (
    <div className="odetail">
      <div className="odetail__facts">
        <Stat label="Entry" value={px(f.fillPx, m)} sub={`Print ${f.idxFill}`} />
        <Stat label="Liquidation price" value={<span className="text-short">{px(levelNow(p)!, m)}</span>} sub={p.marginAdds?.length ? "Moved by added collateral" : "Fixed at the fill"} />
        {pnl !== undefined ? (
          <Stat label="Profit/loss now" value={usdcSigned(pnl)} tone={pnl >= 0n ? "long" : "short"} sub={pnlPct !== undefined ? `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}% of margin` : undefined} />
        ) : (
          <Stat label="Position size" value={usdc(p.notional, 0)} sub="tUSDC" />
        )}
        <Stat label="Margin" value={usdc(margin, 2)} sub={`Premium ${usdc(p.premium, 2)}`} />
      </div>

      {risk && latest && <RiskMeter liq={levelNow(p)!} entry={f.fillPx} now={latest.oraclePx} risk={risk} market={m} />}
      {c && (
        <Results
          items={[
            { label: "Profit/loss", value: `${usdcSigned(c.pnl)} tUSDC`, tone: c.pnl >= 0n ? "long" : "short", note: `Entry ${px(f.fillPx, m)}, exit ${px(c.exitPx, m)}` },
            { label: "Profit fee", value: usdcFine(c.winFee) },
            { label: "Hourly fee", value: usdcFine(c.carryPaid) },
            {
              label: "Payout",
              value: `${usdcFine(c.payout)} tUSDC`,
              note: p.iou ? `${usdcFine(c.payout - p.iou.traderOwed)} paid at close, ${usdcFine(p.iou.traderOwed)} as an IOU` : `${usdcFine(c.premiumReleased)} premium refunded`,
            },
          ]}
        />
      )}
      {l && (
        <Results
          items={[
            { label: "Lost", value: `${usdc(p.collateral)} tUSDC`, tone: "short", note: "Your collateral, and nothing more" },
            { label: "Liquidation price", value: px(levelNow(p)!, m), note: p.marginAdds?.length ? `Moved by added collateral from ${px(f.liqPx, m)} at the fill` : "Fixed at the fill" },
            { label: "Liquidation fee", value: "0.00", note: "There is none" },
          ]}
        />
      )}
      {isLive && !p.breach && <p className="position__note muted">The reserved premium of {usdcFine(p.premium)} tUSDC comes back when you close, unless the price goes beyond your liquidation price.</p>}

      {local !== null && local !== f.fillPx && <Notice tone="warn">The local recomputation differs from the chain ({px(local, m, 1)}). The chain&rsquo;s value is the one that counts.</Notice>}

      {p.marginAdds && p.marginAdds.length > 0 && (
        <ul className="position__events">
          {p.marginAdds.map((a) => (
            <li key={a.tx}>
              Added {usdc(a.amount)} tUSDC of collateral, effective at print {a.idxEffective}. The liquidation price moved to {px(a.newLiqPx, m)}. <TxLink chainId={chainId} hash={a.tx} />
            </li>
          ))}
        </ul>
      )}
      {p.marginPending !== undefined && p.marginPending > 0n && <Notice>{usdc(p.marginPending)} tUSDC of added collateral is waiting for the price update it takes effect on.</Notice>}

      {survival && <SurvivalProof p={p} receipt={survival} />}
      {p.breach && <LiquidationProof p={p} />}

      {p.closeVoids.length > 0 && (
        <Notice tone="warn">
          {p.closeVoids.length} close request{p.closeVoids.length > 1 ? "s were" : " was"} cancelled (no price update qualified within {MAX_FILL_DELAY_SEC} s). The position went back to open. <TxLink chainId={chainId} hash={p.closeVoids.at(-1)!.tx} />
        </Notice>
      )}
      {p.closeCommit && !p.closed && (
        <Notice>
          Close requested at print {p.closeCommit.idxCloseCommit}. It exits at the earliest price update from {p.closeCommit.earliestFill} on that is at least 1 s later, by the keeper’s clock. If that takes more than {MAX_FILL_DELAY_SEC} s, the close is cancelled and the position stays open.
        </Notice>
      )}
      {p.closed && <CloseProof p={p} />}
      {p.iou && <IouNotice p={p} />}

      <Disclosure summary="How this order filled">
        <div className="odetail__fill">
          <div className="printpair">
            <div className="printpair__end">
              <span className="printpair__label">Order</span>
              <span className="printpair__idx printpair__idx--commit">{p.idxCommit}</span>
              <span className="printpair__sub">{commitPrint ? px(commitPrint.oraclePx, m) : "–"}</span>
            </div>
            <div className="printpair__link" aria-hidden="true">
              <span className="printpair__plus">+{p.fence + extra}</span>
              <span className="printpair__line" />
            </div>
            <div className="printpair__end">
              <span className="printpair__label">Fill</span>
              <span className="printpair__idx">{f.idxFill}</span>
              <span className="printpair__sub">{fillPrint && commitTs !== null ? `${((fillPrint.srcTimeMs - commitTs * 1000) / 1000).toFixed(1)} s after you ordered` : "–"}</span>
            </div>
            <p className="printpair__caption">{extra > 0 ? `${p.fence} price updates after the order, plus ${extra} more to satisfy the 1 s rule.` : `${p.fence} price updates after the order.`}</p>
          </div>
          <FillPrice oracle={f.oraclePx} adjusted={adj} fill={f.fillPx} isLong={p.isLong} market={m} />
        <dl className="order__facts">
          <div>
            <dt>Oracle price at the fill</dt>
            <dd>{px(f.oraclePx, m, 1)}</dd>
          </div>
          <div>
            <dt>Order-book mid</dt>
            <dd>
              {px(f.midPx, m, 1)} <span className="muted">{bp(gap)}</span>
            </dd>
          </div>
          <div>
            <dt>Usual gap to the oracle</dt>
            <dd>{bp(basisBp)}</dd>
          </div>
          <div>
            <dt>Book price after the usual gap</dt>
            <dd>{px(adj, m, 1)}</dd>
          </div>
        </dl>
        <p className="order__result">
          Fill price <b>{px(f.fillPx, m, 1)}</b>, {bp(adjBp)} against the oracle. {bookWon ? "The book was worse, so it set the price." : "The oracle was worse, so it set the price."}
        </p>
          <p className="position__note muted">
            {fillSentence(p.fence)}
            {adjBp !== 0 && ` The ${Math.abs(adjBp).toFixed(2)} bp difference goes to the house vault through your entry price, never to fees.`}
          </p>
        </div>
      </Disclosure>

      <Disclosure summary="Rules and terms for this order">
        <div className="position__rules">
          <p>{TIMING_COPY}</p>
          <p>{LIQ_COPY}</p>
          {p.terms && (
            <p>
              Locked when you ordered: profit fee {(p.terms.winFeeBps / 100).toFixed(2)}% of your profit, hourly fee {(p.terms.carryPerHourE8 / 1e6).toFixed(4)}% of position size, and a fill can move at most {(p.terms.maxFillAdjE8 / 1e6).toFixed(2)}% from the oracle price.
            </p>
          )}
          <p>
            Filled in block {f.block.toString()} <TxLink chainId={chainId} hash={f.tx} />, ordered in block {p.commit.block.toString()} <TxLink chainId={chainId} hash={p.commit.tx} />.
          </p>
        </div>
      </Disclosure>
    </div>
  );
}

/** What the vault could not pay when this order closed, and the permissionless call that pays it as room opens up. */
function IouNotice({ p }: { p: PositionRecord }) {
  const { chainId, deployment: d } = useApp();
  const { run, busy, blocked } = useTx(chainId);
  const i = p.iou!;
  const owed = iouOutstanding(i);
  const toYou = i.traderOwed - i.traderPaid;
  const fees = i.carryOwed + i.winOwed - (i.carryPaid + i.winPaid);
  if (owed <= 0n) {
    return (
      <Notice tone="success" title="IOU paid">
        The {usdcFine(i.traderOwed)} tUSDC the vault owed you when this order closed has been paid. {i.lastPaid && <TxLink chainId={chainId} hash={i.lastPaid.tx} />}
      </Notice>
    );
  }
  return (
    <Notice
      tone="warn"
      title="The vault owes you part of this payout"
      actions={
        <Button size="sm" disabled={!!blocked || !!busy || !d} busy={busy === "Pay IOUs"} title="Permissionless. Pays IOUs oldest first, as far as vault equity and the hourly outflow limit allow." onClick={() => d && run("Pay IOUs", claimIousRequest(d, 10n))}>
          Pay IOUs
        </Button>
      }
    >
      The vault could not fund all of this close, so it recorded an IOU. {toYou > 0n ? `${usdcFine(toYou)} tUSDC is still owed to you` : "Your share has been paid"}
      {fees > 0n ? `, and ${usdcFine(fees)} tUSDC in fees is also waiting to be paid` : ""}. IOUs are paid oldest first as vault equity and the hourly outflow limit allow, and anyone can trigger the payment.
    </Notice>
  );
}

function CloseProof({ p }: { p: PositionRecord }) {
  const { chainId, prints } = useApp();
  const c = p.closed!;
  const pr = prints[p.market].find((x) => x.idx === c.idxCloseFill);
  const base = p.closeCommit?.idxCloseCommit;
  // A close fills at the worse of the oracle price and the book mid, once the book's usual gap to the oracle is taken off it.
  const book = pr ? adjMid(c.oraclePx, pr.midPx, BigInt(pr.basisEwmaE8)) : null;
  const worse = book === null ? null : p.isLong ? (book < c.oraclePx ? book : c.oraclePx) : book > c.oraclePx ? book : c.oraclePx;
  return (
    <div className="proof">
      <h3 className="proof__title">Close fill</h3>
      <p>
        Close requested at print {base ?? "–"}, filled at print {c.idxCloseFill}
        {base !== undefined ? ` (${c.idxCloseFill - base} price updates later)` : ""}. The oracle price was {px(c.oraclePx, p.market, 1)}
        {book !== null && <> and the book price, after its usual gap to the oracle, was {px(book, p.market, 1)}</>}. You exit at {px(c.exitPx, p.market, 1)}
        {worse === c.exitPx ? `, the ${p.isLong ? "lower" : "higher"} of the two` : ` (${bp(diffBp(c.exitPx, c.oraclePx))} from the oracle price)`}. <TxLink chainId={chainId} hash={c.tx} />
      </p>
    </div>
  );
}

function LiquidationProof({ p }: { p: PositionRecord }) {
  const { chainId, prints } = useApp();
  const b = p.breach!;
  const l = p.liquidated;
  const self = l && l.caller.toLowerCase() === p.trader.toLowerCase();
  const level = px(levelAt(p, b.idx)!, p.market); // the level in force at the breach print
  const pairStart = l ? l.idx - 1 : null;
  const nextPrint = prints[p.market].find((x) => x.idx === b.idx + 1);
  // judged against the level in force at that print (an add-margin can have moved it since the fill), as the contract's scan does
  const nextLevel = levelAt(p, nextPrint?.idx ?? b.idx + 1)!;
  const nextBeyond = !!nextPrint && (p.isLong ? nextPrint.oraclePx <= nextLevel : nextPrint.oraclePx >= nextLevel);
  return (
    <div className={l ? "proof proof--short" : "proof proof--warn"}>
      <h3 className="proof__title">{l ? "Two price updates in a row beyond your liquidation price" : "One price update beyond your liquidation price"}</h3>
      <ol className="proof__steps">
        <li>
          Print {b.idx} at {px(b.oraclePx, p.market)} crossed your liquidation price {level}. The reserved premium of {usdcFine(b.premiumToVault)} tUSDC went to the vault. <TxLink chainId={chainId} hash={b.tx} />
        </li>
        <li>
          {l ? (
            <>
              {pairStart === b.idx ? `Print ${l.idx}, the very next one,` : `Prints ${pairStart} and ${l.idx}, consecutive,`} at {px(l.oraclePx, p.market)} {pairStart === b.idx ? "was also beyond your liquidation price, which" : "were both beyond your liquidation price, which"} liquidated the position. Settle was called by {self ? "the trader" : `a bystander, ${l.caller.slice(0, 6)}…${l.caller.slice(-4)}`}. <TxLink chainId={chainId} hash={l.tx} />
            </>
          ) : p.closed && p.closed.idxCloseFill === b.idx ? (
            "The position was closed at this update. A single price update never liquidates, but your margin was gone at this price, so the close paid nothing from it."
          ) : !nextPrint ? (
            "The next price update has not arrived yet. If it is beyond your liquidation price too, the position is liquidated; if it comes back inside, the position stays open. A single update never liquidates."
          ) : nextBeyond ? (
            "The next update was beyond your liquidation price too, so the next settle liquidates the position. Nobody has called it yet."
          ) : (
            "The next update came back inside your liquidation price, so the position stayed open. A single update never liquidates. The premium is spent, and two more updates in a row beyond your liquidation price would liquidate."
          )}
        </li>
      </ol>
      {l && (
        <p>
          The loss is exactly the {usdc(p.collateral)} tUSDC you put in ({usdcFine(p.premium)} premium plus {usdcFine(p.collateral - p.premium)} margin, both to the vault). There is no liquidation fee, so no fees were taken from this position.
        </p>
      )}
    </div>
  );
}

function SurvivalProof({ p, receipt }: { p: PositionRecord; receipt: SurvivalReceipt }) {
  const { chainId } = useApp();
  const m = p.market;
  return (
    <div className="proof proof--survived">
      <h3 className="proof__title">Survival receipt: one price update past your liquidation price</h3>
      <p>
        At print {receipt.breachPrint.idx}, Hyperliquid&rsquo;s oracle price of {px(receipt.oraclePx, m, 1)} reached your liquidation price {px(receipt.liqPx, m, 1)}{receipt.beyondBp > 0 ? <>, passing it by <strong className="text-short">{receipt.beyondBp.toFixed(2)} bp</strong></> : null}. Liquidation reads the oracle price only, so this is the update that put you at risk (the book mid was {px(receipt.midPx, m, 1)}). Your premium was used at that print.
      </p>
      <p>
        You survived {receipt.survivedPrints} more price update{receipt.survivedPrints > 1 ? "s" : ""}
        {receipt.closedAfterBreach ? " and closed safely" : " and the position is still open"}. A venue that liquidates on a single price update would have liquidated this position then. That comparison is hypothetical and applies to your own position only. <TxLink chainId={chainId} hash={p.fill!.tx} label="Fill transaction" />
      </p>
    </div>
  );
}
