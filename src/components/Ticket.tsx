import { useEffect, useState } from "react";
import { maxUint256, parseEventLogs } from "viem";
import { useSwitchChain } from "wagmi";
import { positionManagerAbi, testUSDCAbi } from "../abi/generated";
import { useApp } from "../app-context";
import { CHAIN_LABEL } from "../config/chains";
import { type Snapshot } from "../hooks/data";
import { useTx } from "../hooks/tx";
import { fixed, pct, px, usdc } from "../lib/format";
import { BLACKOUT_MAX_LEV, commitOpenRequest, marginTooThin, maxPremiumFor } from "../lib/protocol";
import { useDraft } from "./draft";
import { HowFills } from "./HowFills";
import { NotLive } from "./NotLive";
import { Badge, Button, Chips, Disclosure, Field, Input, Notice, Receipt, ReceiptRow, Segmented } from "./ui";
import { ConnectMenu } from "./Wallet";
import { verifyAvailable } from "./VerifyTier";

export type TradeMode = "basic" | "advanced";

const COLLATERAL_PRESETS = ["20", "50", "100", "500"];
const BALANCE_SHARES = ["25%", "50%", "75%", "Max"];
/** Below this balance the ticket offers free test tUSDC. */
const LOW_BALANCE = 100_000_000n;

/** The next start of a blackout window within 7 days, as "Mon 12:24 UTC". */
function nextBlackout(ws: Snapshot["pm"]["blackouts"], nowSec: number): string | null {
  let best: number | null = null;
  const day = Math.floor(nowSec / 86400);
  for (let k = 0; k < 8; k++) {
    const wd = (day + k + 4) % 7;
    for (const w of ws) {
      if (((w.weekdayMask >> wd) & 1) === 0) continue;
      const start = (day + k) * 86400 + w.startSec;
      if (start > nowSec && (best === null || start < best)) best = start;
    }
  }
  if (best === null) return null;
  const d = new Date(best * 1000);
  return `${d.toUTCString().slice(0, 3)} ${d.toISOString().slice(11, 16)} UTC`;
}

const hhmm = (sec: number) => `${String(Math.floor(sec / 3600)).padStart(2, "0")}:${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}`;

/** "weekdays 12:24 to 12:40 and 13:24 to 13:40 UTC", read from PositionManager.blackouts() */
function windowsText(ws: Snapshot["pm"]["blackouts"]): string {
  if (!ws.length) return "none";
  const days = ws.every((w) => w.weekdayMask === 0x3e) ? "weekdays " : "";
  return `${days}${ws.map((w) => `${hhmm(w.startSec)} to ${hhmm(w.endSec)}`).join(" and ")} UTC`;
}

/** An amount of tUSDC as the text of the collateral field: no grouping, no trailing zeros. */
function asInput(v: bigint): string {
  const s = fixed(v, 6, 6).replace(/,/g, "");
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

/** A slider with its presets as labelled ticks along the track. */
function LeverageSlider({ value, max, ticks, onChange }: { value: number; max: number; ticks: number[]; onChange: (v: number) => void }) {
  const at = (v: number) => (v - 1) / Math.max(1, max - 1);
  return (
    <div className="lev">
      <input
        type="range"
        className="slider"
        min={1}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--p" as string]: `${at(value) * 100}%` }}
        aria-label="Leverage"
        aria-valuetext={`${value}x`}
      />
      <div className="lev__ticks" role="group" aria-label="Leverage presets">
        {ticks.map((t) => (
          <button key={t} type="button" className="lev__tick" style={{ ["--t" as string]: at(t) }} aria-pressed={t === value} onClick={() => onChange(t)}>
            {t}x
          </button>
        ))}
      </div>
    </div>
  );
}

/** The leverage as a number you can type, for the advanced layout. It follows the slider and clamps to the account's cap. */
function LeverageInput({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <span className="levinput">
      <input
        inputMode="numeric"
        value={text}
        aria-label="Leverage, typed"
        onChange={(e) => {
          const t = e.target.value.replace(/\D/g, "").slice(0, 4);
          setText(t);
          const n = Number(t);
          if (n >= 1) onChange(Math.min(max, n));
        }}
        onBlur={() => setText(String(value))}
      />
      <span aria-hidden="true">x</span>
    </span>
  );
}

/** Stands in for take profit and stop loss. They need the contracts to run triggers, which they do not do yet. */
function Targets() {
  return (
    <Disclosure
      summary={
        <span className="inline-gap">
          Take profit and stop loss <Badge>Planned</Badge>
        </span>
      }
    >
      <div className="ticket__targets">
        <div className="ticket__pair">
          <Field as="label" label="Take profit">
            <Input small disabled placeholder="Price" unit="USD" aria-label="Take profit price" />
          </Field>
          <Field as="label" label="Stop loss">
            <Input small disabled placeholder="Price" unit="USD" aria-label="Stop loss price" />
          </Field>
        </div>
        <p className="ticket__fine">A trigger would close a position when the price reaches a level you set. The contracts do not run triggers yet, so close from Positions whenever you like.</p>
      </div>
    </Disclosure>
  );
}

export function Ticket({ mode }: { mode: TradeMode }) {
  const { marketLive } = useApp();
  return marketLive ? <LiveTicket mode={mode} /> : <NotLive />;
}

function LiveTicket({ mode }: { mode: TradeMode }) {
  const { chainId, deployment: d, snap, market, selected, address, openOrder, openVerify } = useApp();
  const { run, busy, blocked } = useTx(chainId);
  const { switchChain } = useSwitchChain();
  const { isLong, setIsLong, colStr, setColStr, setLev, guard, setGuard, maxLev, leverage, collateral, quote, quoteStale } = useDraft();
  const advanced = mode === "advanced";
  const symbol = selected.symbol;

  const pm = snap?.pm;
  const ms = snap?.markets[market];
  const u = snap?.user;
  const tier = u?.tier ?? 0;

  const oracle = ms?.latest?.oraclePx;
  const liqDistPct = quote && oracle && quote.liq > 0n ? (Math.abs(Number(quote.liq - oracle)) / Number(oracle)) * 100 : null;
  // The level on the ticket assumes the worst fill the contract allows. A fill nearer the oracle sets it margin / notional away.
  const fillDistPct = quote && quote.notional > 0n ? (Number(quote.margin) / Number(quote.notional)) * 100 : null;
  const worstFillPct = (pm?.maxFillAdjE8 ?? 15e4) / 1e6;
  const premPct = quote && collateral ? (Number(quote.prem) / Number(collateral)) * 100 : null;
  const nowSec = Math.floor(Date.now() / 1000);
  const blackoutBites = !!pm && leverage > BLACKOUT_MAX_LEV && pm.inBlackoutNow;
  const nextWin = pm ? nextBlackout(pm.blackouts, nowSec) : null;
  const maxPremium = quote ? maxPremiumFor(quote.prem, guard) : null;
  const needsFunds = !!u && collateral !== null && u.usdc < collateral;
  const needsApprove = !!u && collateral !== null && u.allowance < collateral;
  const canVerify = tier !== 1 && !!pm && verifyAvailable(chainId) && pm.maxLevVerified > pm.maxLevDefault;

  // What is wrong with the amount typed in, shown under the field.
  let inputError: string | null = null;
  if (collateral === null) inputError = "Enter an amount in tUSDC, up to 6 decimals.";
  else if (pm && collateral < pm.minCollateral) inputError = `The minimum is ${usdc(pm.minCollateral)} tUSDC.`;
  else if (u && collateral > u.usdc) inputError = "That is more than your balance.";

  // What the venue will refuse, shown as notices.
  const venue: string[] = [];
  if (snap && !snap.ring.isFresh) venue.push("Prices have stopped updating, so new trades are paused until they resume.");
  else if (ms && !ms.fresh) venue.push(`${symbol} prices have stopped updating, so new ${symbol} trades are paused until they resume.`);
  if (pm?.isCloseOnly) {
    const why = pm.guardianCloseOnly ? "by the operator" : snap!.vault.isCloseOnly ? "because the vault hit its daily loss limit" : pm.totalIou > 0n ? "until the vault pays what it owes winners" : "right now";
    venue.push(`New trades are paused ${why}. You can still close.`);
  }
  if (blackoutBites) venue.push(`Above ${BLACKOUT_MAX_LEV}x, new trades are paused during this blackout window.`);
  if (pm && quote && quote.notional > pm.maxPositionNotional) venue.push(`That position is above the ${usdc(pm.maxPositionNotional, 0)} tUSDC limit.`);
  if (quote && collateral !== null && quote.prem >= collateral) venue.push("The premium would use up all of your collateral at this leverage. Lower the leverage.");
  else if (quote && pm && collateral !== null && marginTooThin(collateral, quote.prem, quote.notional, pm.maxFillAdjE8))
    venue.push(`At ${leverage}x the margin is too thin to cover a fill ${pct(pm.maxFillAdjE8 / 1e6, 2)} worse than the current price. Lower the leverage.`);

  const stuck = inputError !== null || venue.length > 0 || !quote || quoteStale;

  const faucet = () => d && address && run("Get 1,000 test tUSDC", { address: d.TestUSDC, abi: testUSDCAbi, functionName: "mint", args: [address, 1_000_000_000n] });
  const approve = () => d && run("Approve tUSDC", { address: d.TestUSDC, abi: testUSDCAbi, functionName: "approve", args: [d.PositionManager, maxUint256] });
  const open = async () => {
    if (!d || collateral === null || maxPremium === null) return;
    const r = await run(`Open ${isLong ? "long" : "short"} ${symbol} ${leverage}x`, commitOpenRequest(d, market, isLong, collateral, leverage, maxPremium));
    if (r) {
      const ev = parseEventLogs({ abi: positionManagerAbi, logs: r.logs, eventName: "PositionCommitted" })[0];
      if (ev) openOrder(ev.args.id);
    }
  };
  const shareOfBalance = (label: string) => {
    if (!u) return;
    const share = label === "Max" ? 100n : BigInt(parseInt(label, 10));
    setColStr(asInput((u.usdc * share) / 100n));
  };

  const ticks = [1, 25, 50, 100, ...(maxLev > 100 ? [maxLev] : [])].filter((t) => t <= maxLev);
  const wrongChain = blocked === "Your wallet is on another chain.";
  const winFee = pm ? pm.winFeeBps / 100 : null;
  const carryBp = pm ? pm.carryPerHourE8 / 1e4 : null;

  const premiumLimit = (
    <div className="ticket__group">
      <Field label="Premium limit" aside={maxPremium !== null ? <>Up to <strong>{usdc(maxPremium)}</strong></> : undefined}>
        <Chips label="Premium limit above the quote" options={[1.1, 1.25, 1.5]} value={guard} onChange={setGuard} format={(g) => `+${Math.round((g - 1) * 100)}%`} fill />
      </Field>
      <p className="ticket__fine">If volatility lifts the premium past this before your order lands, the order is cancelled instead of charging more.</p>
    </div>
  );

  return (
    <section className="ticket" aria-label="New order" data-side={isLong ? "long" : "short"} data-mode={mode}>
      {advanced && (
        <header className="ticket__head">
          <h2 className="ticket__title">New order</h2>
        </header>
      )}

      <Segmented
        label="Side"
        value={isLong ? "long" : "short"}
        onChange={(v) => setIsLong(v === "long")}
        options={[
          { value: "long", label: "Long", tone: "long" },
          { value: "short", label: "Short", tone: "short" },
        ]}
        size="lg"
        full
        tinted
      />

      <div className="ticket__group">
        <Field as="label" label="Collateral" aside={u ? <>Balance <strong>{usdc(u.usdc)}</strong> tUSDC</> : undefined}>
          <Input large inputMode="decimal" value={colStr} onChange={(e) => setColStr(e.target.value)} unit="tUSDC" invalid={inputError !== null} aria-label="Collateral in tUSDC" autoComplete="off" />
        </Field>
        {advanced && !!u && u.usdc > 0n ? (
          <Chips label="Share of balance" options={BALANCE_SHARES} value={null} onChange={shareOfBalance} fill />
        ) : (
          <Chips label="Collateral presets" options={COLLATERAL_PRESETS} value={colStr} onChange={setColStr} fill />
        )}
        {inputError && <p className="ticket__error">{inputError}</p>}
        {address && !needsFunds && !!u && u.usdc < LOW_BALANCE && (
          <button type="button" className="linklike ticket__faucet" onClick={faucet} disabled={!!blocked || !!busy} title="Mints mock tUSDC. It has no value.">
            Get 1,000 test tUSDC
          </button>
        )}
      </div>

      <div className="ticket__group">
        <Field label="Leverage" aside={advanced ? <LeverageInput value={leverage} max={maxLev} onChange={setLev} /> : <strong>{leverage}x</strong>}>
          <LeverageSlider value={leverage} max={maxLev} ticks={ticks} onChange={setLev} />
        </Field>
        {leverage > BLACKOUT_MAX_LEV && !blackoutBites && nextWin && pm && (
          <p className="ticket__fine">
            Above {BLACKOUT_MAX_LEV}x, new trades are paused in blackout windows ({windowsText(pm.blackouts)}). The next one starts {nextWin}.
          </p>
        )}
        {canVerify && (
          <p className="ticket__fine">
            <button type="button" className="linklike" onClick={openVerify}>
              Verify your Hyperliquid history for up to {pm!.maxLevVerified}x
            </button>
          </p>
        )}
      </div>

      {advanced && (
        <>
          {premiumLimit}
          <Targets />
        </>
      )}

      <Receipt label="Order summary" className="summary">
        {advanced && <ReceiptRow label="Oracle price">{oracle !== undefined ? px(oracle, market) : "–"}</ReceiptRow>}
        <ReceiptRow label="Position size">{quote ? `${usdc(quote.notional)} tUSDC` : "–"}</ReceiptRow>
        {advanced && <ReceiptRow label="Margin">{quote ? usdc(quote.margin) : "–"}</ReceiptRow>}
        <ReceiptRow
          label="Reserved premium"
          note={`${advanced && premPct !== null ? `${pct(premPct, 1)} of your collateral. ` : ""}Returned when you close, unless your liquidation price is crossed.`}
        >
          {quote ? usdc(quote.prem) : "–"}
        </ReceiptRow>
        <ReceiptRow
          label="Liquidation price"
          tone="short"
          note={
            quote && liqDistPct !== null && fillDistPct !== null
              ? advanced
                ? `${pct(fillDistPct, 2)} from your fill price. At worst ${pct(liqDistPct, 2)} ${isLong ? "below" : "above"} the current price, if your fill is ${pct(worstFillPct, 2)} worse. Your fill sets the final price.`
                : `At worst ${pct(liqDistPct, 2)} ${isLong ? "below" : "above"} the current price. Your fill sets the final price.`
              : undefined
          }
        >
          {quote ? px(quote.liq, market) : "–"}
        </ReceiptRow>
        {winFee !== null && carryBp !== null && (
          <ReceiptRow label="Fees">
            {winFee}% of profit + {pct(carryBp / 100, 4)} an hour
          </ReceiptRow>
        )}
        <ReceiptRow label="Most you can lose" total note="Your collateral, with no liquidation fee.">
          {collateral !== null ? `${usdc(collateral)} tUSDC` : "–"}
        </ReceiptRow>
      </Receipt>

      {venue.map((v) => (
        <Notice key={v} tone="warn">
          {v}
        </Notice>
      ))}

      <div className="ticket__act">
        {!address ? (
          <ConnectMenu block size="lg" label="Connect wallet to trade" />
        ) : needsFunds ? (
          <Button block size="lg" onClick={faucet} busy={busy === "Get 1,000 test tUSDC"} disabled={!!blocked || !!busy} title="Mints mock tUSDC. It has no value.">
            Get 1,000 test tUSDC
          </Button>
        ) : needsApprove ? (
          <Button block size="lg" onClick={approve} busy={busy === "Approve tUSDC"} disabled={!!blocked || !!busy}>
            Approve tUSDC
          </Button>
        ) : (
          <Button block size="lg" variant={isLong ? "long" : "short"} onClick={open} busy={!!busy?.startsWith("Open")} disabled={!!blocked || !!busy || stuck}>
            Open {isLong ? "long" : "short"} {symbol}
          </Button>
        )}
        {address && blocked && (
          <Notice
            tone="warn"
            actions={
              wrongChain ? (
                <Button size="sm" variant="secondary" onClick={() => switchChain({ chainId })}>
                  Switch to {CHAIN_LABEL[chainId]}
                </Button>
              ) : undefined
            }
          >
            {blocked}
          </Notice>
        )}
        <p className="ticket__fine ticket__fine--center">
          Fills on the second price update after you order or, if that one is stamped under 1 s after your order, on the first later one stamped at least 1 s after it. The price signer's clock sets the stamp. <HowFills />
        </p>
      </div>
    </section>
  );
}
