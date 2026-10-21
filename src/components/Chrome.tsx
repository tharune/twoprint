import { useState } from "react";
import { useApp } from "../app-context";
import { DEPLOYMENTS, ELYSIUM_RPC_OVERRIDE, IS_LOCAL_HOST, explorerAddress, rpcHost } from "../config/chains";
import { short } from "../lib/format";
import { href, scrollToSection, useRoute } from "../lib/router";
import { IconExternal, Logo } from "./icons";
import { Modal } from "./ui";

/** A strip for the person running the app on their own machine with `?bench`: which node it reads, and any synthetic move. Never shown to users. */
export function DevStrip() {
  const { chainId, dev } = useApp();
  if (!IS_LOCAL_HOST || new URLSearchParams(window.location.search).get("bench") === null) return null;
  const synthetic = dev ? Object.entries(dev.offsetBp).filter(([, v]) => Math.abs(v) >= 0.5) : [];
  return (
    <aside className="strip" aria-label="Developer notice">
      <div className="strip__inner">
        <p>
          {chainId === 31337 && <>Local node with {dev ? (dev.source === "hl" ? "live Hyperliquid prices" : "simulated prices") : "no price script running"}.</>}
          {chainId === 99801 && ELYSIUM_RPC_OVERRIDE && <>Reads via {rpcHost(ELYSIUM_RPC_OVERRIDE)} (VITE_ELYSIUM_RPC).</>}
        </p>
        {synthetic.length > 0 && (
          <p className="strip__synthetic">
            Synthetic move active: {synthetic.map(([m, v]) => `${m} ${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(0)} bp`).join(", ")}
          </p>
        )}
      </div>
    </aside>
  );
}

/** Navigation and testnet disclosure, sharing the closing panel's surface on the home and docs pages. */
export function SiteFooter() {
  const { route } = useRoute();
  const { chainId, snap, openTrust } = useApp();
  const [contracts, setContracts] = useState(false);
  const d = DEPLOYMENTS[chainId];
  const isDocs = route === "docs";
  const rows: [string, string][] = d
    ? [
        ["PositionManager", d.PositionManager],
        ["PriceRing", d.PriceRing],
        ["HouseVault", d.HouseVault],
        ["FeeRouter", d.FeeRouter],
        ["TierRegistry", d.TierRegistry],
        ["tUSDC", d.TestUSDC],
        ...(snap?.ring.signer ? ([["Price signer", snap.ring.signer]] as [string, string][]) : []),
      ]
    : [];
  const section = (id: string) => (e: React.MouseEvent) => {
    if (isDocs && scrollToSection(id)) e.preventDefault();
  };
  return (
    <footer className="site-footer" data-tone={route === "home" || isDocs ? "panel" : undefined}>
      <div className="site-footer__inner">
        <div className="site-footer__top">
          <a className="brand" href={href("home")} aria-label="Twoprint home">
            <Logo size={20} />
            <span>Twoprint</span>
          </a>
          <nav className="site-footer__nav" aria-label="Footer">
            <div className="site-footer__group">
              <a href={href("trade")}>Trade</a>
              <a href={href("portfolio")}>Portfolio</a>
              <a href={href("house")}>House</a>
            </div>
            <div className="site-footer__group">
              <a href={href("docs")}>Docs</a>
              <a href={href("docs", "how")} onClick={section("how")}>
                How it works
              </a>
              <button type="button" className="linklike" onClick={openTrust} aria-haspopup="dialog">
                Trust
              </button>
              {d && (
                <button type="button" className="linklike" onClick={() => setContracts(true)} aria-haspopup="dialog">
                  Contracts
                </button>
              )}
            </div>
          </nav>
        </div>
        <div className="site-footer__bottom">
          <p className="site-footer__fine">Testnet only. tUSDC is a mock token with no value, and DEMO stands in for the TWOPRINT token. One price signer posts every price: see Trust.</p>
          <a className="site-footer__credit" href="https://www.tradingview.com/" target="_blank" rel="noreferrer" title="Charts use TradingView Lightweight Charts">
            Charts by TradingView <IconExternal />
          </a>
        </div>
      </div>
      {d && (
        <Modal open={contracts} onClose={() => setContracts(false)} title="Contracts" sub="The addresses this app reads and writes, each with its explorer page.">
          <ul className="addr-list">
            {rows.map(([name, addr]) => {
              const url = explorerAddress(chainId, addr);
              return (
                <li key={name}>
                  <span>{name}</span>
                  {url ? (
                    <a className="txlink" href={url} target="_blank" rel="noreferrer">
                      {short(addr)}
                      <IconExternal />
                    </a>
                  ) : (
                    <code title={addr}>{short(addr)}</code>
                  )}
                </li>
              );
            })}
          </ul>
        </Modal>
      )}
    </footer>
  );
}
