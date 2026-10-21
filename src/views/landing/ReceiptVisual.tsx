import { useApp } from "../../app-context";
import { EXAMPLE_COLLATERAL } from "../../lib/premium";

const LEVERAGE = 100;
const MOVE = 0.0056;
const MINUTES = 24;

const money = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** One winning trade, itemized. The fee rates are the deployed ones; the trade is an example. */
export function ReceiptVisual() {
  const { snap } = useApp();
  const winFee = snap ? snap.pm.winFeeBps / 10_000 : 0.02;
  const carryPerHour = snap ? snap.pm.carryPerHourE8 / 1e8 : 0.000025;
  const notional = EXAMPLE_COLLATERAL * LEVERAGE;
  const gain = notional * MOVE;
  const fee = gain * winFee;
  const carry = notional * carryPerHour * (MINUTES / 60);
  const kept = gain - fee - carry;
  const rows: [string, string][] = [
    ["Price gain", `+${money(gain)}`],
    [`Profit fee, ${(winFee * 100).toFixed(0)}%`, `−${money(fee)}`],
    [`Hourly fee, ${MINUTES} min`, `−${money(carry)}`],
  ];
  return (
    <figure className="stage rc" aria-label="An itemized receipt for one winning trade.">
      <header className="rc__head">
        <b>BTC long, {LEVERAGE}x</b>
        <span className="muted">{money(EXAMPLE_COLLATERAL)} tUSDC collateral</span>
      </header>
      <dl className="rc__rows">
        {rows.map(([k, v], i) => (
          <div key={k} style={{ ["--k" as string]: i }}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="rc__total" style={{ ["--k" as string]: rows.length }}>
        <span>Your profit</span>
        <b>
          +{money(kept)} <small>tUSDC</small>
        </b>
      </p>
      <figcaption className="rc__cap">Example: the price rises {(MOVE * 100).toFixed(2)}% and you close after {MINUTES} minutes.</figcaption>
    </figure>
  );
}
