import { useApp } from "../../app-context";
import { Reveal } from "./motion";

/**
 * The plain answers to what a first-time visitor asks. This is where the detail lives that the sections above leave out, so each
 * answer is a few short sentences. The list runs the width of the page, and the answer about trust opens the full list of who has
 * power over Twoprint.
 */
export function Faq() {
  const { snap, openTrust } = useApp();
  const win = snap ? snap.pm.winFeeBps / 100 : 2;
  const carryPct = snap ? snap.pm.carryPerHourE8 / 1e6 : 0.0025;
  const maxLev = snap?.pm.maxLevDefault ?? 100;
  // The hourly fee is a share of position size, so at full leverage it is that many times larger as a share of collateral.
  const carryOnCollateral = +(carryPct * maxLev).toFixed(2);
  const items: { q: string; a: React.ReactNode }[] = [
    {
      q: "What is Twoprint?",
      a: `A place to trade BTC and ETH with up to ${maxLev}x leverage. Prices come from Hyperliquid and orders settle on the Elysium blockchain. It’s live on Elysium’s testnet, where tUSDC is a test token with no value.`,
    },
    {
      q: "How is my order priced?",
      a: "You get whichever is worse for you of Hyperliquid’s oracle price and its order-book price, at the second price update after you order. That’s why pushing the order book can’t get you a better price than the oracle’s.",
    },
    {
      q: "What happens when the price moves against me?",
      a: "Two price updates in a row past your liquidation price liquidate you. If just one goes past, you stay open and lose only the small premium you set aside when you opened. You can never lose more than your collateral, and there’s no liquidation fee.",
    },
    {
      q: "What does it cost?",
      a: `A profit fee of ${win}% of your profit and an hourly fee of ${carryPct}% of your position size. At ${maxLev}x, that hourly fee is ${carryOnCollateral}% of your collateral per hour. Fees come out of your position, never the rest of your wallet, and every one is on your receipt and listed on the Fees page.`,
    },
    {
      q: "Who do I have to trust?",
      a: (
        <>
          Twoprint relies on a price signer and contract owners. One price signer posts every price and can see your order before it fills. A hacked or dishonest signer could fill or liquidate orders unfairly within set limits, and one admin key controls the settings today.{" "}
          <button type="button" className="linklike" onClick={openTrust} aria-haspopup="dialog">
            See everyone with power over it.
          </button>
        </>
      ),
    },
    {
      q: "How do I try it?",
      a: "Open the app, connect a wallet, get free test tUSDC from the order form and place an order.",
    },
  ];
  return (
    <section className="split split--band faq-wide" id="faq" aria-labelledby="faq-title">
      <div className="faq-wide__in">
        <Reveal>
          <h2 className="l-title" id="faq-title">
            Common questions
          </h2>
        </Reveal>
        <Reveal className="faq" delay={140}>
          {items.map((it) => (
            <details key={it.q} className="faq__item">
              <summary>{it.q}</summary>
              <p>{it.a}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
