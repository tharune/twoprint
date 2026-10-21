import { useApp } from "../../app-context";
import { IconCheck } from "../../components/icons";
import { Button } from "../../components/ui";
import { href } from "../../lib/router";
import { zeroAddress } from "viem";
import { enabledLegs, splitSentence } from "../../lib/split";
import { FillVisual } from "./FillVisual";
import { CLOSING, ChartBands } from "./LiveField";
import { ModesVisual } from "./ModesVisual";
import { ReceiptVisual } from "./ReceiptVisual";
import { RiskVisual } from "./RiskVisual";
import { Split } from "./Split";
import { VaultVisual } from "./VaultVisual";
import { Reveal } from "./motion";

/*
 * The ideas the product rests on, one section each with a picture of it. The docs page shows all of them in order; the home page
 * shows most of them and links each one to its place in the docs. A sentence and a few points say it; the picture shows it.
 */

/** The way from a section on the home page to the same section in the docs. */
function DocsLink({ id }: { id: string }) {
  return (
    <a className="l-more" href={href("docs", id)}>
      More in the docs <span aria-hidden="true">&rarr;</span>
    </a>
  );
}

export function How({ more }: { more?: boolean }) {
  return (
    <Split
      id="how"
      action={more ? <DocsLink id="how" /> : undefined}
      title="Orders fill on the second price update"
      lead="After you order, it waits for two price updates from Hyperliquid and fills on the second."
      stats={[
        { value: "2", label: "Price updates before it fills" },
        { value: "3–4 s", label: "Usually between price updates" },
        { value: "2 min", label: "Then it’s cancelled and refunded" },
      ]}
      points={["Pushing Hyperliquid’s order book can’t get you a better price", "Anyone can finish an order, not just us"]}
    >
      <FillVisual />
    </Split>
  );
}

export function Risk({ more }: { more?: boolean }) {
  return (
    <Split
      id="risk"
      action={more ? <DocsLink id="risk" /> : undefined}
      flip
      band
      title="One bad price can’t liquidate you"
      lead="It takes two price updates in a row past your liquidation price. If just one goes past, you stay open and lose the small premium you set aside when you opened."
      points={["Add collateral to push your liquidation price further from the market price", "The app warns you as the price gets close"]}
    >
      <RiskVisual />
    </Split>
  );
}

export function Markets({ more }: { more?: boolean }) {
  return (
    <Split
      id="markets"
      action={more ? <DocsLink id="markets" /> : undefined}
      title="Each kind of market gets its own vault"
      lead="A vault is the pool that pays winners and collects from losers. Only BTC and ETH are live. Stocks, forex and commodities are planned, each with its own vault so a loss in one wouldn’t reach the others."
      points={["See each vault’s balance and open positions on the House page"]}
    >
      <VaultVisual />
    </Split>
  );
}

export function Fees({ more }: { more?: boolean }) {
  const { snap } = useApp();
  const split = snap?.fees.split ?? null;
  const legacy = !!snap && !split; // a router from before the split; while nothing is read yet, the copy stays neutral
  // No KNTQ venue is wired on this deployment, so that leg accrues and nothing is bought.
  const kntqIdle = !!split && enabledLegs(split.mask).includes(1) && split.kntqAdapter === zeroAddress;
  const win = snap ? snap.pm.winFeeBps / 100 : 2;
  const carryPct = snap ? snap.pm.carryPerHourE8 / 1e6 : 0.0025; // per hour, as a percentage of position size
  return (
    <Split
      id="fees"
      action={more ? <DocsLink id="fees" /> : undefined}
      flip
      band
      title="Two fees, both on your receipt"
      lead={`You pay ${win}% of your profit and an hourly fee of ${carryPct}% of your position size.`}
      points={[split ? `${splitSentence(split.mask)}${kntqIdle ? ". Today the KNTQ share only accrues: there is no KNTQ venue on testnet" : ""}` : legacy ? "Fees fund buybacks" : "Fees never go into the vault", "Every fee payment is listed on the Fees page"]}
    >
      <ReceiptVisual />
    </Split>
  );
}

export function Modes({ more }: { more?: boolean }) {
  return (
    <Split
      id="modes"
      action={more ? <DocsLink id="modes" /> : undefined}
      title="Basic or Advanced"
      lead="One switch in the header changes every page. Basic is just what you need to place an order and follow it. Advanced adds more charts and tables."
      points={["Basic: a price chart, a simple order form and your open positions", "Advanced: candles, order book depth, full tables, and the Markets, Activity, Fees and Funds pages"]}
    >
      <ModesVisual />
    </Split>
  );
}

/** What anyone can check without trusting the team, and what the team cannot do. */
const CHECKS = [
  { title: "Recompute any result", text: "Anyone can recompute every fill, liquidation and fee from the public price record." },
  { title: "A second checker", text: "A separate program recomputes every result from chain events and flags any mismatch." },
  { title: "The team can only take back its deposit", text: "It can’t take the vault’s profits, or withdraw while winners are owed." },
];

/**
 * What you are trusting. It lives on the docs page, with the list of everyone who has power over Twoprint one click away: the
 * home page leaves it to the questions, where the same facts are given in words.
 */
export function Trust() {
  const { openTrust } = useApp();
  return (
    <Split
      id="trust"
      flip
      title="What you have to trust"
      lead="Twoprint relies on a price signer and contract owners. One price signer posts every price and can see your order before it fills. A hacked or dishonest signer could fill or liquidate orders unfairly within set limits, and one admin key controls the settings today."
      action={
        <Button variant="secondary" onClick={openTrust} aria-haspopup="dialog">
          See everyone with power over it
        </Button>
      }
    >
      <ul className="stage tc" aria-label="What you can check yourself">
        {CHECKS.map((c, k) => (
          <li key={c.title} style={{ ["--k" as string]: k }}>
            <span className="tc__icon" aria-hidden="true">
              <IconCheck />
            </span>
            <div>
              <b>{c.title}</b>
              <p>{c.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </Split>
  );
}

export function Closing() {
  return (
    <section className="closing" aria-labelledby="closing-title">
      {/* The same real, scrolling charts as the first screen, across the bottom of the panel. */}
      <ChartBands bands={CLOSING} className="livefield--closing" />
      <Reveal className="closing__panel">
        <h2 className="closing__title" id="closing-title">
          Open your first position
        </h2>
        <p className="closing__lede">Connect a wallet, get free test tUSDC and place your first trade.</p>
        <a className="btn btn--primary btn--lg" href={href("trade")}>
          Open the app
        </a>
      </Reveal>
    </section>
  );
}
