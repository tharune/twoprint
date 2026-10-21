import { useMemo, useState } from "react";
import { useApp } from "../app-context";
import { SkeletonList } from "../components/Skeleton";
import { Badge, Empty, Field, Input, Notice, Receipt, ReceiptRow, Stat } from "../components/ui";
import { stateOf, type PositionRecord } from "../hooks/data";
import { short, usdc, usdcSigned } from "../lib/format";
import {
  DEFAULT_INSURANCE_FLOOR_USDC,
  PER_IDENTITY_WEEKLY_CAP_USDC,
  calculateSurplusPool,
  houseTradingPnl,
  netIdentityPositions,
} from "../lib/netsplit";

const REASON: Record<string, string> = {
  house_trading_not_profitable: "The house has not won on trades yet, so the pool is empty. Net Split pays only after the house wins.",
  equity_below_insurance_floor: "Vault equity is below the seed plus the $10,000 floor, so nothing is shared yet.",
};

/** The netting math takes flat position fields; the ledger keeps fills and closes in nested records. */
const forNetting = (p: PositionRecord) => ({
  state: stateOf(p),
  liquidated: p.liquidated,
  collateral: p.collateral,
  premium: p.premium,
  entryPx: p.fill?.fillPx,
  exitPx: p.closed?.exitPx,
  notional: p.notional,
  isLong: p.isLong,
  market: p.market,
});

export function NetSplit() {
  const { snap, mine, address, ledgerReady } = useApp();
  const [offsetStr, setOffsetStr] = useState("0");
  const [simLoss, setSimLoss] = useState(100);
  const [simGain, setSimGain] = useState(100);

  const surplus = useMemo(() => {
    if (!snap) return null;
    const pnl = houseTradingPnl(snap.vault);
    return calculateSurplusPool({
      equity: snap.vault.equity,
      seedDeposited: snap.vault.seedDeposited,
      seedWithdrawn: snap.vault.seedWithdrawn,
      weeklyRealizedTradingPnl: pnl > 0n ? pnl : 0n,
    });
  }, [snap]);
  const housePnl = snap ? houseTradingPnl(snap.vault) : 0n;
  const poolEmpty = (surplus?.poolBudget ?? 0n) === 0n;

  const offset = useMemo(() => {
    const n = parseFloat(offsetStr);
    return Number.isFinite(n) && n !== 0 ? BigInt(Math.round(n * 1e6)) : 0n;
  }, [offsetStr]);
  const netting = useMemo(() => (address ? netIdentityPositions(address, mine.map(forNetting), offset) : null), [address, mine, offset]);

  // The sandbox: the same rules on numbers you choose.
  const lossBig = BigInt(Math.round(simLoss * 1e6));
  const gainBig = BigInt(Math.round(simGain * 1e6));
  const simNet = gainBig - lossBig;
  const simHedged = lossBig > 0n && simNet >= 0n;
  const simEligible = simNet < 0n ? -simNet : 0n;
  const simPay = simHedged ? 0n : simEligible > PER_IDENTITY_WEEKLY_CAP_USDC ? PER_IDENTITY_WEEKLY_CAP_USDC : simEligible;

  return (
    <div className="stackp">
      <p className="muted lede-block">
        The plan: up to 30% of what the house won, above its seed and a $10,000 floor, goes to traders who lost net. Losses are netted across sides and markets, and against an offsetting Hyperliquid position when that data is supplied. Each identity is capped at $25 a week, and a hedged pair gets $0.
      </p>

      <div className="cols2">
        <section className="book" aria-labelledby="ns-pool">
          <header className="book__head">
            <h2 id="ns-pool">This week&rsquo;s pool</h2>
            <p>Preview only. No distribution is scheduled on this deployment.</p>
          </header>
          <Stat large label="Distributable" value={`${usdc(surplus?.poolBudget ?? 0n, 2)} tUSDC`} sub="30% of the surplus above the floor" />
          <Receipt label="How the pool is sized">
            <ReceiptRow label="Vault equity">{usdc(surplus?.equity ?? 0n, 2)}</ReceiptRow>
            <ReceiptRow label="Seed outstanding" note="Only the team can take this back, and only up to the seed.">
              {usdc(surplus?.seedOutstanding ?? 0n, 2)}
            </ReceiptRow>
            <ReceiptRow label="Insurance floor" note="A buffer that always stays in the vault.">
              {usdc(DEFAULT_INSURANCE_FLOOR_USDC, 2)}
            </ReceiptRow>
            <ReceiptRow label="Surplus above the floor" tone="long">
              {usdc(surplus?.surplusAboveFloor ?? 0n, 2)}
            </ReceiptRow>
            <ReceiptRow label="House trading P&L to date" tone={housePnl >= 0n ? "long" : "short"} note="Stands in for this week's realized surplus. The weekly counter computes the exact figure.">
              {usdcSigned(housePnl, 2)}
            </ReceiptRow>
            <ReceiptRow label="Pool (30%)" total>
              {usdc(surplus?.poolBudget ?? 0n, 2)}
            </ReceiptRow>
          </Receipt>
          {surplus?.reason && <Notice>{REASON[surplus.reason]}</Notice>}
        </section>

        <section className="book" aria-labelledby="ns-you">
          <header className="book__head">
            <h2 id="ns-you">Your netting</h2>
            <p>{address ? short(address) : "Connect a wallet to see it."}</p>
          </header>
          {!address || !netting ? (
            <Empty title="No wallet connected">Connect a wallet to see how your positions net out and whether you would share in the pool.</Empty>
          ) : !ledgerReady ? (
            <SkeletonList rows={5} />
          ) : (
            <>
              <Stat
                large
                label="Your eligible loss"
                tone={netting.isHedged ? "warn" : netting.cappedLoss > 0n ? "long" : undefined}
                value={`${usdc(netting.cappedLoss, 2)} tUSDC`}
                sub={
                  netting.isHedged
                    ? "Hedged pair: $0"
                    : netting.cappedLoss > 0n
                      ? poolEmpty
                        ? "Counts toward the pool, which is empty right now, so nothing would be paid."
                        : "Counts toward the pool, up to $25 a week."
                      : "No net loss"
                }
              />
              <Receipt label="Your net price P&L">
                <ReceiptRow
                  label="Twoprint price P&L"
                  tone={netting.twoprintNetPnl >= 0n ? "long" : "short"}
                  note={`Net across ${netting.positionCount} position${netting.positionCount === 1 ? "" : "s"}, BTC and ETH, longs and shorts. Carry and premiums are excluded.`}
                >
                  {usdcSigned(netting.twoprintNetPnl, 2)}
                </ReceiptRow>
                <ReceiptRow label="Hyperliquid offset P&L" tone={netting.hlOffsetPnl >= 0n ? "long" : "short"} note="The app does not read your Hyperliquid account. The weekly counter does. Try a number below.">
                  {usdcSigned(netting.hlOffsetPnl, 2)}
                </ReceiptRow>
                <ReceiptRow label="Combined" total tone={netting.overallNetPnl >= 0n ? "long" : "short"}>
                  {usdcSigned(netting.overallNetPnl, 2)}
                </ReceiptRow>
                <ReceiptRow label="Weekly cap per identity">{usdc(PER_IDENTITY_WEEKLY_CAP_USDC, 2)}</ReceiptRow>
              </Receipt>
              <Field as="label" label="Try an offsetting Hyperliquid P&L" hint="A gain on a Hyperliquid position that offsets your Twoprint loss. Positive numbers are gains.">
                <Input small type="number" inputMode="decimal" value={offsetStr} onChange={(e) => setOffsetStr(e.target.value)} unit="USD" placeholder="0" />
              </Field>
            </>
          )}
        </section>
      </div>

      <section className="book" aria-labelledby="ns-try">
        <header className="book__head">
          <h2 id="ns-try">See how netting works</h2>
        </header>
        <p className="muted">If someone hedges a $100 Twoprint loss with a $100 Hyperliquid gain, their combined P&amp;L is zero, so their share is $0. Move the sliders to try other numbers.</p>
        <div className="sim">
          <Field label="Twoprint loss" aside={<strong>${simLoss}</strong>}>
            <input
              type="range"
              className="slider"
              min={0}
              max={500}
              step={10}
              value={simLoss}
              onChange={(e) => setSimLoss(Number(e.target.value))}
              style={{ ["--p" as string]: `${(simLoss / 500) * 100}%` }}
              aria-label="Twoprint loss in dollars"
            />
          </Field>
          <Field label="Hyperliquid gain on the hedge" aside={<strong>${simGain}</strong>}>
            <input
              type="range"
              className="slider"
              min={0}
              max={500}
              step={10}
              value={simGain}
              onChange={(e) => setSimGain(Number(e.target.value))}
              style={{ ["--p" as string]: `${(simGain / 500) * 100}%` }}
              aria-label="Hyperliquid gain in dollars"
            />
          </Field>
          <Receipt label="Result">
            <ReceiptRow label="Combined P&L" tone={simNet >= 0n ? "long" : "short"}>
              {usdcSigned(simNet, 2)}
            </ReceiptRow>
            <ReceiptRow label="Net Split share" total tone={simPay > 0n ? "long" : "muted"} note={simHedged ? "A hedged pair gets nothing." : simEligible > PER_IDENTITY_WEEKLY_CAP_USDC ? "Capped at $25 for the week." : undefined}>
              {usdc(simPay, 2)} tUSDC
            </ReceiptRow>
          </Receipt>
        </div>
      </section>

      <section className="book" aria-labelledby="ns-weeks">
        <header className="book__head book__head--row">
          <h2 id="ns-weeks">Published weeks</h2>
          <Badge>None yet</Badge>
        </header>
        <p className="muted">
          The plan: each week&rsquo;s allocation is computed off-chain by the netting counter in the keeper&rsquo;s source, signed by a publisher and posted as a Merkle root with an input manifest. Today nothing runs that counter, publishes a root or pays anyone. This deployment has no payout contract, and the vault&rsquo;s surplus stays in the vault.
        </p>
        <Empty title="Nothing published yet">A first allocation needs a payout contract and a publisher, and a vault above the seed plus the $10,000 floor.</Empty>
      </section>
    </div>
  );
}
