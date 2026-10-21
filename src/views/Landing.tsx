import { useEffect, useState } from "react";
import { useApp } from "../app-context";
import { useTick } from "../components/Market";
import { useNow } from "../hooks/data";
import { feedView } from "../lib/feed";
import { MARKETS, px } from "../lib/format";
import { href, scrollToSection } from "../lib/router";
import { Faq } from "./landing/Faq";
import { LiveStrip } from "./landing/LiveStrip";
import { Ripple } from "./landing/Ripple";
import { Closing, Fees, How, Markets, Modes, Risk } from "./landing/Sections";
import { canAnimate } from "./landing/motion";

/**
 * Short on purpose. A first screen that is the product (the promise, the way in, and the live feed moving behind them), then one
 * idea at a time with a picture of it, each with a link on to the docs, then the questions people ask and a way in.
 */
export function Landing() {
  // Decided before the first paint, so nothing flashes in and then hides again.
  const [animate] = useState(canAnimate);
  // While the visitor reads, fetch the code of the page the buttons lead to, so opening the app is instant.
  useEffect(() => {
    const warm = () => void import("./Trade");
    const idle = (window as Window & { requestIdleCallback?: (fn: () => void) => number }).requestIdleCallback;
    const id = idle ? idle(warm) : window.setTimeout(warm, 1500);
    return () => {
      if (!idle) window.clearTimeout(id);
    };
  }, []);
  return (
    <div className="landing" data-motion={animate ? "on" : undefined}>
      <Hero />
      <How more />
      <Risk more />
      <Markets more />
      <Fees more />
      <Modes more />
      <Faq />
      <Closing />
    </div>
  );
}

function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <Ripple />
      <div className="hero__in">
        <div className="hero__eyebrow" data-seq style={{ ["--i" as string]: 0 }}>
          <span className="hero__live-tag">
            <i aria-hidden="true" />
            Live on Elysium testnet
          </span>
          <LiveQuotes />
        </div>
        <h1 className="hero__title" id="hero-title" data-seq style={{ ["--i" as string]: 1 }}>
          <span>Leverage</span>
          <span>you can verify</span>
        </h1>
        <p className="hero__lede" data-seq style={{ ["--i" as string]: 2 }}>
          Trade BTC and ETH with up to 100x leverage. Every fill, liquidation and fee can be recalculated from the public record.
        </p>
        <div className="hero__actions" data-seq style={{ ["--i" as string]: 3 }}>
          <a className="btn btn--primary btn--lg" href={href("trade")}>
            Open the app
          </a>
          <a
            className="btn btn--secondary btn--lg"
            href={href("home", "how")}
            onClick={(e) => {
              if (scrollToSection("how")) e.preventDefault();
            }}
          >
            See how it works
          </a>
        </div>
      </div>
      <div className="hero__live" data-seq style={{ ["--i" as string]: 4 }}>
        <LiveStrip />
      </div>
    </section>
  );
}

/** Every market's oracle price, flashing its direction each time a price update lands. Nothing shows until the chain has been read. */
function LiveQuotes() {
  const { snap } = useApp();
  const now = useNow(1000);
  const stale = !!snap && feedView(snap, now).state !== "live"; // a frozen read or a stale feed: the last price is not live
  return (
    <ul className="quotes" aria-label="Oracle prices">
      {MARKETS.map((m, i) => (
        <Quote key={m} market={i} value={snap?.markets[i]?.latest?.oraclePx} stale={stale} />
      ))}
    </ul>
  );
}

function Quote({ market, value, stale }: { market: number; value: bigint | undefined; stale: boolean }) {
  const tick = useTick(value, market);
  return (
    <li className="quotes__item">
      <span className="quotes__sym">{MARKETS[market]}</span>
      <span key={tick.n} className="quotes__px" data-tick={tick.dir ?? undefined}>
        {value !== undefined ? px(value, market) : "–"}
      </span>
      {stale && value !== undefined && <span className="muted"> stale</span>}
    </li>
  );
}
