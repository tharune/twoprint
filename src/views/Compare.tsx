import { useMemo, useState, type ReactNode } from "react";
import { useApp } from "../app-context";
import { Badge, Chips, Field, Input, PageHeader, Receipt, ReceiptRow, Segmented, TableWrap } from "../components/ui";
import { M1_ROUND_TRIP_BP, PAPERTRADE, compare, money, twoprintParams, type TradeInput, type TwoprintParams, type VenueResult } from "../lib/compare";
import { splitPhrase } from "../lib/split";
import { PushScene } from "./compare/PushScene";

/** Entry prices for the liquidation price when the chain has not answered: made up, and labelled so. */
const EXAMPLE_ENTRY = [108_000, 3_900];

const num = (s: string, lo: number, hi: number) => {
  const v = Number(s);
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null;
};
const pctOf = (v: number, dp = 2) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(dp)}%`;
const signedMoney = (v: number) => (v > 0 ? `+${money(v)}` : money(v));
const pxFmt = (v: number, market: number) => v.toLocaleString("en-US", { minimumFractionDigits: market === 0 ? 1 : 2, maximumFractionDigits: market === 0 ? 1 : 2 });

/** The fee-destination sentence. It must stay true under whatever split the deployed FeeRouter has. */
export function feeDestination(mask: number | null): string {
  return mask !== null
    ? `Fees go to the FeeRouter, never to the vault, and it splits them between ${splitPhrase(mask)}.`
    : "Fees go to the FeeRouter, never to the vault.";
}

export function Compare() {
  const { snap } = useApp();
  const [market, setMarket] = useState<0 | 1>(0);
  const [isLong, setIsLong] = useState(true);
  const [levS, setLevS] = useState("100");
  const [colS, setColS] = useState("100");
  const [moveS, setMoveS] = useState("0.1");
  const [holdS, setHoldS] = useState("1");

  const leverage = num(levS, 1, 1000) ?? 100;
  const collateral = num(colS, 0.01, 1e9) ?? 100;
  const movePct = num(moveS, -99, 1000) ?? 0;
  const holdHours = num(holdS, 0, 10_000) ?? 0;

  const latest = snap?.markets[market]?.latest;
  const liveEntry = latest ? Number(latest.oraclePx) / 1e8 : null;
  const entryPx = liveEntry ?? EXAMPLE_ENTRY[market];
  const params: TwoprintParams = useMemo(() => twoprintParams(snap?.pm, snap?.markets[market]?.sigmaE8), [snap?.pm, snap?.markets, market]);
  const live = !!snap;

  const input: TradeInput = { market, isLong, leverage, collateral, movePct, holdHours, entryPx };
  const r = compare(input, params);
  const mask = snap?.fees.split?.mask ?? null;
  const winner = movePct !== 0 && (isLong ? movePct > 0 : movePct < 0);
  const inM1 = winner && Math.abs(holdHours - 1) < 1e-9;

  return (
    <div className="wrap compare">
      <PageHeader
        title="Twoprint vs Papertrade"
        lede="The same trade on both venues: what a winner keeps, where you are liquidated, and every fee line. Papertrade's side is its published formula; Twoprint's side reads the live parameters from the chain."
      />

      <section className="cmp-calc" aria-labelledby="calc-title">
        <h2 id="calc-title" className="cmp-h2">
          Same trade, both venues
        </h2>
        <div className="cmp-inputs">
          <Field label="Market">
            <Segmented label="Market" value={market} onChange={(v) => setMarket(v as 0 | 1)} options={[{ value: 0, label: "BTC" }, { value: 1, label: "ETH" }]} />
          </Field>
          <Field label="Side">
            <Segmented label="Side" value={isLong ? "long" : "short"} onChange={(v) => setIsLong(v === "long")} options={[{ value: "long", label: "Long" }, { value: "short", label: "Short" }]} />
          </Field>
          <Field label="Leverage" hint="Papertrade 1–1000x. Twoprint up to its live cap.">
            <Input inputMode="decimal" value={levS} onChange={(e) => setLevS(e.target.value)} unit="x" aria-label="Leverage" />
            <Chips label="Leverage presets" options={[10, 50, 100, 500, 1000]} value={leverage} onChange={(v) => setLevS(String(v))} format={(v) => `${v}x`} />
          </Field>
          <Field label="Collateral (margin)">
            <Input inputMode="decimal" value={colS} onChange={(e) => setColS(e.target.value)} unit="USD" aria-label="Collateral" />
          </Field>
          <Field label="Price move" hint="Signed: +0.1 means the price rose 0.1%.">
            <Input inputMode="decimal" value={moveS} onChange={(e) => setMoveS(e.target.value)} unit="%" aria-label="Price move in percent" />
            <Chips label="Move presets" options={[0.05, 0.1, 0.25, 1, -0.5]} value={movePct} onChange={(v) => setMoveS(String(v))} format={(v) => `${v > 0 ? "+" : ""}${v}%`} />
          </Field>
          <Field label="Hold" hint="Twoprint charges carry per hour; Papertrade has none.">
            <Input inputMode="decimal" value={holdS} onChange={(e) => setHoldS(e.target.value)} unit="h" aria-label="Hold hours" />
          </Field>
        </div>

        <div className="cmp-results">
          <VenueCard
            name="Papertrade"
            badge={<Badge tone="warn">INFERENCE</Badge>}
            source={`Docs formula + launch values; INFERENCE, contracts unverified; as of block ${PAPERTRADE.asOfBlock.toLocaleString("en-US")}.`}
            r={r.papertrade}
            market={market}
            collateral={collateral}
            exampleEntry={liveEntry === null}
            footer={market === 1 ? "If Papertrade's pending ETH refNotional change to $150k executes, ETH keeps 63.7% (not 69.0%) of a 0.1% move." : undefined}
          />
          <VenueCard
            name="Twoprint"
            badge={<Badge tone={live ? "carbon" : "neutral"}>{live ? `Live, block ${snap!.block.toString()}` : "Config fallback"}</Badge>}
            source={
              live
                ? `PositionManager.params() and σ̂ ${(params.sigmaE8 / 1e4).toFixed(2)} bp per print read from the chain. Fill cost: M1's ${M1_ROUND_TRIP_BP[market].toFixed(2)} bp round trip, measured, lower bound.`
                : `Config.sol values (the chain has not answered) and a typical σ̂ of ${(params.sigmaE8 / 1e4).toFixed(2)} bp. Fill cost: M1's ${M1_ROUND_TRIP_BP[market].toFixed(2)} bp round trip, measured, lower bound.`
            }
            r={r.twoprint}
            market={market}
            collateral={collateral}
            exampleEntry={liveEntry === null}
            footer={`${feeDestination(mask)} The worse-of fill difference and a consumed premium are not fees: they go to the vault, like trader losses.`}
          />
        </div>

        <Verdict pt={r.papertrade} tp={r.twoprint} />

        <div className="cmp-conditions">
          <h3>M1&rsquo;s conditions (part of the result)</h3>
          {!inM1 && (
            <p className="cmp-outside">
              This trade is outside them ({[!winner && "not a winner", Math.abs(holdHours - 1) >= 1e-9 && `a ${holdHours} h hold, not 1 h`].filter(Boolean).join(", ")}), so these are the same formulas, not M1&rsquo;s measured result.
            </p>
          )}
          <ul>
            <li>Winners only, the same price move on both venues, mean fill cost, a 1 h hold, no breach, weekend tape, the live Config. Gas is ignored.</li>
            <li>Different price fields: Twoprint settles on oraclePx and Papertrade on the HL mid. Their gap has an sd of about 1.0 / 1.5 bp (BTC / ETH, % of margin at 100x), about the size of the lead at moves ≤ 0.1%.</li>
            <li>The fill cost is a lower bound (one live Elysium hour ran 4–6% higher) and grows with σ̂: the 0.05% lead disappears at a round trip of 1.65 / 1.99 bp. At p90 fill cost the two venues are about level at a 0.05% move.</li>
            <li>Each extra hour costs Twoprint 0.25% of margin at 100x, so the 0.1% lead lasts about 8–10 h of holding.</li>
            <li>Liquidation is judged on the end price of the move only; the path is ignored. A wick past the level that comes back is not modelled (Papertrade would bust on the mid crossing its bust price; Twoprint takes the premium on one oracle print beyond the level and liquidates on two in a row).</li>
            <li>A breach forfeits Twoprint&rsquo;s premium. Carry (up to 10 bp/h), the win fee (up to 10%) and the worse-of cap are owner-settable.</li>
          </ul>
        </div>
      </section>

      <CompareTable params={params} mask={mask} />

      <PushScene />
    </div>
  );
}

function VenueCard({ name, badge, source, r, market, collateral, exampleEntry, footer }: { name: string; badge: ReactNode; source: string; r: VenueResult; market: number; collateral: number; exampleEntry: boolean; footer?: string }) {
  return (
    <section className="cmp-venue" aria-label={`${name} result`}>
      <header className="cmp-venue__head">
        <h3>{name}</h3>
        {badge}
      </header>
      <p className="cmp-venue__src">{source}</p>
      {!r.available ? (
        <p className="cmp-venue__na">{r.unavailable}</p>
      ) : (
        <>
          <div className="cmp-venue__kept">
            <span className="cmp-venue__label">{r.liquidated ? "Liquidated" : "Kept PnL"}</span>
            <strong className={r.kept > 0 ? "text-long" : r.kept < 0 ? "text-short" : undefined}>{signedMoney(r.kept)}</strong>
            <span className="cmp-venue__pct">{pctOf(r.keptPct)} of margin</span>
          </div>
          <Receipt label={`${name} lines`}>
            <ReceiptRow label="Notional">{money(r.notional)}</ReceiptRow>
            <ReceiptRow label="Raw PnL on the move">{signedMoney(r.raw)}</ReceiptRow>
            {r.fees.map((f) => (
              <ReceiptRow key={f.label} label={f.label} note={f.note} tone={f.amount > 0 ? "short" : "muted"}>
                {f.amount > 0 ? `−${money(f.amount)}` : money(0)}
              </ReceiptRow>
            ))}
            <ReceiptRow label="Liquidation price" note={`${(r.liqDistance * 100).toFixed(3)}% (${(r.liqDistance * 1e4).toFixed(1)} bp) from entry.${exampleEntry ? " The entry price is an example: the chain has not answered." : ""}`}>
              {pxFmt(r.liqPx, market)}
            </ReceiptRow>
            <ReceiptRow label="Payout" total>
              {money(Math.max(0, collateral + r.kept))}
            </ReceiptRow>
          </Receipt>
          <p className="cmp-venue__foot">Liquidation is judged on the end price of the move only. A wick that goes past the level and comes back is not modelled.</p>
          {r.warnings.map((w) => (
            <p key={w} className="cmp-venue__warn">
              {w}
            </p>
          ))}
        </>
      )}
      {footer && <p className="cmp-venue__foot">{footer}</p>}
    </section>
  );
}

function Verdict({ pt, tp }: { pt: VenueResult; tp: VenueResult }) {
  if (!pt.available || !tp.available) return null;
  const diff = tp.kept - pt.kept;
  let text: string;
  if (pt.kept > 0 && tp.kept > 0) text = `Twoprint keeps ${signedMoney(diff)} ${diff >= 0 ? "more" : "(less)"}: ${pctOf((tp.kept / pt.kept - 1) * 100, 0)} relative to Papertrade on this trade.`;
  else text = `Difference, Twoprint minus Papertrade: ${signedMoney(diff)}.`;
  const liq = (tp.liqDistance - pt.liqDistance) * 1e4;
  return (
    <p className="cmp-verdict">
      {text} Twoprint&rsquo;s liquidation level is {Math.abs(liq).toFixed(1)} bp {liq >= 0 ? "further from" : "closer to"} entry than Papertrade&rsquo;s bust.
    </p>
  );
}

// ---------------------------------------------------------------- the §2 table

interface Row {
  axis: string;
  pt: string;
  tp: string;
  verdict: string;
  who: "Twoprint" | "Papertrade" | "Different" | "Tie" | "Slight Twoprint";
}

function rows(params: TwoprintParams, mask: number | null): Row[] {
  const prem = (params.premiumMultE4 / 1e4) * (Math.max(params.sigmaE8, params.sigmaFloorE8) / 1e8) * 1e4; // bp of notional
  const level100 = 100 - prem;
  return [
    {
      axis: "Price manipulation",
      pt: "Every fill is Hyperliquid's BBO mid, with no deviation, TWAP or lookback check. On Oct 10 (UTC) one wallet netted $1.28M closing 500x–600x positions at a pushed mid.",
      tp: "The worse of oraclePx (Hyperliquid's validator-median oracle) and the basis-adjusted mid, at a print at least 2 later and signed at least 1 s after the commit (by the keeper's clock), inside a 3%·max(1, √(dt/3 s)) jump band. Liquidation uses oraclePx only and needs two consecutive prints.",
      verdict: "Much harder to push: pushing the book can't get you a better price than the oracle. Limits: a push in your direction waives the fill cost on that leg (mean 0.14–0.46 bp, not a bound); a push overcharges other traders' fills while it lasts (mean 11.6 bp for a 12 bp push, cap 15 bp); and a replay found a +0.14 bp latency edge for the best CEX-tape attacker on BTC.",
      who: "Twoprint",
    },
    {
      axis: "Exit vs liquidation ordering",
      pt: "An operator relayer orders intents by type and size, with adaptive weights.",
      tp: "No relayer. Every commit is an on-chain transaction, and its outcome is fixed by a public print log anyone can re-check. Settle is permissionless.",
      verdict: "No operator queue orders exits by size. The signer still decides when prints are posted (a close voids after 120 s without a qualifying print), the sequencer orders and can censor, and two consecutive breach prints inside the 2-print fence liquidate first.",
      who: "Twoprint",
    },
    {
      axis: "What a winner keeps",
      pt: "A 0.2 bp deadband, then an impact haircut (BTC keeps about 74% of a 0.1% move), then 2%.",
      tp: "A 2% win fee, the worse-of fill cost (0.44 / 0.59 bp per round trip, lower bounds) and carry of 0.25 bp/h.",
      verdict: "Under M1's conditions Twoprint pays winners 12–51% more. All-in at 100x it keeps about 91% / 90% of a 0.1% move and 97% of a 1% move (BTC / ETH).",
      who: "Twoprint",
    },
    {
      axis: "Liquidation distance",
      pt: "A fixed buffer of about 5 bp of price before zero equity: 95 bp from entry at 100x. The whole margin is forfeited (the 2% liquidation fee comes out of it).",
      tp: "The bankruptcy price on collateral minus the premium. The premium (c·σ̂·notional) is refunded if never consumed. No liquidation fee.",
      verdict: `${level100 < 95 ? "Papertrade is ahead" : "Twoprint is ahead"}. At 100x the live premium (${prem.toFixed(1)} bp of notional at normal volatility) puts our level about ${level100.toFixed(1)} bp from entry, against Papertrade's 95 bp.`,
      who: level100 < 95 ? "Papertrade" : "Twoprint",
    },
    {
      axis: "Max leverage",
      pt: "1000x. 85.8% of Papertrade's notional is above 100x (our on-chain scan).",
      tp: `${params.maxLeverage}x (the live cap).`,
      verdict: "Papertrade wins, clearly: high leverage is what its users trade. 1000x is already copied elsewhere, so it is not a moat, but it is not ours either.",
      who: "Papertrade",
    },
    {
      axis: "Order types",
      pt: "Market and full close.",
      tp: "Market, full close and fenced add-margin.",
      verdict: "A slight Twoprint edge.",
      who: "Slight Twoprint",
    },
    {
      axis: "Trust",
      pt: "Upgradeable proxies, unverified, no published audit. A custom 7-day timelock owned by a 2-of-3 multisig, which can also pause or retire markets instantly; a hot key moves OI caps with no delay. An operation cutting the delay to 1 day was scheduled to become executable at Oct 19 22:01:36 UTC (as of block 48,934,907).",
      tp: "Verified and not upgradeable. HouseVault has no owner (the team can take back only its seed), with an immutable outflow limit of 10% of equity per hour. But one deployer key owns PositionManager, PriceRing and TierRegistry, with no timelock and no multisig; replacing the signer is instant; the signer sees every commit and chooses the next in-band prints. No external audit.",
      verdict: "Different risks, not a win. Papertrade's admin is a 2-of-3 multisig behind a timelock; ours is one key with no delay, plus a signer who sees orders.",
      who: "Different",
    },
    {
      axis: "Value accrual",
      pt: "LP surplus above $5M goes to non-transferable PAPER stakers: effectively a loss rebate that favours whales (the top loss decile got 72% back).",
      tp: `${feeDestination(mask)} Spending a buyback leg is the policy of one executor key, not a contract property. Net Split is off-chain and preview-only.`,
      verdict: "Papertrade's loop is stronger for retention; ours is more transparent.",
      who: "Papertrade",
    },
    { axis: "Markets", pt: "BTC and ETH (any HL perp later).", tp: "BTC and ETH.", verdict: "A tie.", who: "Tie" },
    {
      axis: "Chain",
      pt: "HyperEVM, behind a relayer queue (INFERENCE: partly a response to slow blocks).",
      tp: "Elysium: about 0.2 s blocks (testnet, measured 150–190 ms).",
      verdict: "Elysium is fast enough that no relayer queue is needed.",
      who: "Twoprint",
    },
  ];
}

function CompareTable({ params, mask }: { params: TwoprintParams; mask: number | null }) {
  return (
    <section className="cmp-table" aria-labelledby="table-title">
      <h2 id="table-title" className="cmp-h2">
        Axis by axis, honestly
      </h2>
      <p className="cmp-sub">Including where Papertrade wins. Papertrade facts are as of block 48,934,907 (Oct 19, 05:56 UTC); its on-chain field meanings are decoded from unverified contracts.</p>
      <TableWrap label="Twoprint and Papertrade compared axis by axis">
        <table className="table cmp-grid">
          <thead>
            <tr>
              <th scope="col">Axis</th>
              <th scope="col">Papertrade</th>
              <th scope="col">Twoprint (live on 99801)</th>
              <th scope="col">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {rows(params, mask).map((r) => (
              <tr key={r.axis}>
                <th scope="row">{r.axis}</th>
                <td>{r.pt}</td>
                <td>{r.tp}</td>
                <td>
                  <Badge tone={r.who === "Papertrade" ? "warn" : r.who === "Twoprint" || r.who === "Slight Twoprint" ? "long" : "neutral"}>{r.who === "Different" ? "Different risks" : r.who}</Badge>
                  <span className="cmp-grid__verdict">{r.verdict}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </section>
  );
}
