import { useApp } from "../../app-context";
import { Badge, Gauge, Receipt, ReceiptRow } from "../../components/ui";
import { MARKETS, usdc } from "../../lib/format";

const k = (v: bigint) => usdc(v, 0);
const MAX = (1n << 256n) - 1n;
const utc = (t: bigint) => new Date(Number(t) * 1000).toISOString().slice(0, 16).replace("T", " ") + " UTC";

/** How full the vault's caps are, and the checks that stop new opens before it could not pay. */
export function RiskPanel() {
  const { snap } = useApp();
  if (!snap) return null;
  const { pm, vault: v, markets } = snap;
  const st = pm.stress;
  const net = pm.factorLongOI > pm.factorShortOI ? pm.factorLongOI - pm.factorShortOI : pm.factorShortOI - pm.factorLongOI;
  const ddLine = (v.dayStartEquity * (10_000n - v.maxDailyDrawdownBps)) / 10_000n;
  const stressCap = (pm.freeEquity * BigInt(st.maxUtilBps)) / 10_000n;
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const latched = v.closeOnlyUntil > nowSec;
  const closeOnlyWhy = [pm.guardianCloseOnly && "guardian", v.isCloseOnly && "vault breaker", pm.totalIou > 0n && "IOUs outstanding"].filter(Boolean).join(", ");

  return (
    <div className="cols2">
      <section className="panel stackp" aria-labelledby="risk-oi">
        <header className="panel__head">
          <h2 id="risk-oi">Open interest</h2>
        </header>
        <div className="panel__body stackp">
          <p className="muted">BTC and ETH count as one risk factor, so a long on one and a short on the other still adds up against the same caps.</p>
          <div className="gauges">
            <Gauge label="Factor long" value={pm.factorLongOI} cap={pm.maxSideOI} fmt={k} />
            <Gauge label="Factor short" value={pm.factorShortOI} cap={pm.maxSideOI} fmt={k} />
            <Gauge label="Net, long minus short" value={net} cap={pm.maxNetOI} fmt={k} note="Trades that reduce the net are always allowed" />
          </div>
          <Receipt label="Per market">
            {MARKETS.map((name, m) => (
              <ReceiptRow key={name} label={name}>
                {`Long ${k(markets[m].longOI)} of ${k(markets[m].maxLongOI)}, short ${k(markets[m].shortOI)} of ${k(markets[m].maxShortOI)}`}
              </ReceiptRow>
            ))}
          </Receipt>
        </div>
      </section>

      <section className="panel stackp" aria-labelledby="risk-stress">
        <header className="panel__head">
          <h2 id="risk-stress">Stress and breaker</h2>
          {pm.isCloseOnly ? (
            <Badge tone="short" dot>
              Close-only{closeOnlyWhy ? `: ${closeOnlyWhy}` : ""}
            </Badge>
          ) : (
            <Badge tone="long" dot>
              Opens allowed
            </Badge>
          )}
        </header>
        <div className="panel__body stackp">
          <p className="muted">
            The most the vault could owe winners in the worst of five tail scenarios, counting both sides and giving no credit for losers. New orders that would push it above the cap are rejected.
          </p>
          <Gauge label="Stress liability" value={pm.stressLiability} cap={stressCap} fmt={k} tone="carbon" note={`Against free equity times ${(st.maxUtilBps / 100).toFixed(0)}%`} />
          <p className="muted">
            Scenarios: no move, both up (BTC +{(st.btcUpBps / 100).toFixed(1)}%, ETH +{(st.ethUpBps / 100).toFixed(1)}%), both down (BTC −{(st.btcDnBps / 100).toFixed(1)}%, ETH −{(st.ethDnBps / 100).toFixed(1)}%), and the two ETH/BTC ratio moves of {(st.ratioBps / 100).toFixed(0)}%.
          </p>
          <Receipt label="Breaker">
            <ReceiptRow label="Free equity" note="Vault equity net of IOUs">
              {k(pm.freeEquity)}
            </ReceiptRow>
            <ReceiptRow label="Required capital">{pm.requiredCapital === MAX ? "Unbounded while IOUs are owed" : k(pm.requiredCapital)}</ReceiptRow>
            <ReceiptRow label="Day-start equity">{k(v.dayStartEquity)}</ReceiptRow>
            <ReceiptRow label={`Close-only below (−${(Number(v.maxDailyDrawdownBps) / 100).toFixed(0)}%)`}>{k(ddLine)}</ReceiptRow>
            <ReceiptRow label="Breaker latch">{latched ? `Until ${utc(v.closeOnlyUntil)}` : "Not latched"}</ReceiptRow>
            <ReceiptRow label="Escrowed in live positions">{usdc(pm.escrowed)}</ReceiptRow>
          </Receipt>
        </div>
      </section>
    </div>
  );
}
