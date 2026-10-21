import { useEffect, useMemo, useState } from "react";
import { useApp } from "../app-context";
import { CHAIN_LABEL, DEPLOYMENTS, SELECTABLE_CHAINS, chainById } from "../config/chains";
import { stateOf, useNow, type PositionRecord, type Snapshot } from "../hooks/data";
import { FEED_DOT, feedView } from "../lib/feed";
import { computeLiquidationDistance, type AlertTier } from "../lib/alerts";
import { levelNow } from "../lib/receipt";
import { cx } from "../lib/cx";
import { useNarrow } from "../hooks/useNarrow";
import { useMode } from "../lib/mode";
import { href, pagesFor, useRoute, type Route } from "../lib/router";
import { useTheme } from "../lib/theme";
import { IconChevronDown, IconExternal, IconMoon, IconSun, Logo } from "./icons";
import { Popover, Segmented } from "./ui";
import { WalletMenu } from "./Wallet";


const TIER_ORDER: AlertTier[] = ["SAFE", "WARNING", "DANGER", "CRITICAL", "BREACHED"];

/** The worst liquidation-distance tier across the connected account's live positions. */
function useRisk(mine: PositionRecord[], snap: Snapshot | undefined) {
  return useMemo(() => {
    let worst: AlertTier = "SAFE";
    let count = 0;
    for (const p of mine) {
      if (!p.fill || !["Open", "PendingClose"].includes(stateOf(p))) continue;
      const latest = snap?.markets[p.market]?.latest;
      if (!latest) continue;
      const r = computeLiquidationDistance({
        oraclePx: latest.oraclePx,
        entryPx: p.fill.fillPx,
        liqPx: levelNow(p)!,
        margin: p.collateral - p.premium,
        notional: p.notional,
        isLong: p.isLong,
      });
      if (r.alertTier === "SAFE") continue;
      count++;
      if (TIER_ORDER.indexOf(r.alertTier) > TIER_ORDER.indexOf(worst)) worst = r.alertTier;
    }
    return { worst, count };
  }, [mine, snap]);
}

export function SiteHeader() {
  const { route } = useRoute();
  // The home page and the docs share the site's header: the docs, and a way into the app.
  const isHome = route === "home" || route === "docs";
  // On the landing page the header starts clear, so the page's first light reaches the top edge, and settles once you scroll.
  const [top, setTop] = useState(true);
  useEffect(() => {
    if (!isHome) return;
    const on = () => setTop(window.scrollY < 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [isHome]);
  return (
    <header className="site-header" data-top={isHome && top ? "true" : undefined}>
      <div className={cx("site-header__inner", isHome && "site-header__inner--home")}>
        <a className="brand" href="#/" aria-label="Twoprint home">
          <Logo size={22} />
          <span>Twoprint</span>
        </a>
        {isHome ? <HomeNav route={route} /> : <AppNav route={route} />}
        <span className="site-header__break" aria-hidden="true" />
        <div className="site-header__end">
          {isHome ? (
            <>
              <ThemeToggle />
              <a className="btn btn--primary btn--sm" href={href("trade")}>
                Open app
              </a>
            </>
          ) : (
            <>
              <ModeToggle />
              <div className="site-header__tools">
                <NetworkMenu />
                <ThemeToggle />
              </div>
              <WalletMenu />
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function HomeNav({ route }: { route: Route }) {
  return (
    <nav className="site-nav" aria-label="Site">
      <a href={href("docs")} aria-current={route === "docs" ? "page" : undefined}>
        Docs
      </a>
    </nav>
  );
}

function AppNav({ route }: { route: Route }) {
  const { mine, snap } = useApp();
  const [mode] = useMode();
  // The minor pages always sit under "More"; on a window too narrow for the rest, every page only Advanced lists does.
  const tight = useNarrow(1279);
  const risk = useRisk(mine, snap);
  const pages = pagesFor(mode);
  const shown = pages.filter((p) => !p.advanced || (!tight && !p.minor));
  const more = pages.filter((p) => !shown.includes(p));
  return (
    <nav className="site-nav" aria-label="App">
      {shown.map((r) => (
        <a key={r.route} href={href(r.route)} aria-current={route === r.route ? "page" : undefined}>
          {r.label}
          {r.route === "portfolio" && risk.count > 0 && (
            <span
              className="nav-dot"
              data-tier={risk.worst}
              title={`${risk.count} position${risk.count > 1 ? "s" : ""} near liquidation`}
              role="img"
              aria-label={`${risk.count} position${risk.count > 1 ? "s" : ""} near liquidation`}
            />
          )}
        </a>
      ))}
      {more.length > 0 && (
        <Popover
          label="More pages"
          align="left"
          trigger={({ open, toggle }) => (
            <button type="button" className="site-nav__more" aria-expanded={open} aria-haspopup="true" aria-current={more.some((p) => p.route === route) ? "page" : undefined} onClick={toggle} data-pop-trigger>
              More
              <IconChevronDown />
            </button>
          )}
        >
          {(close) => (
            <>
              {more.map((p) => (
                <a key={p.route} className="menu-item" href={href(p.route)} aria-current={route === p.route ? "true" : undefined} onClick={close}>
                  {p.label}
                </a>
              ))}
            </>
          )}
        </Popover>
      )}
    </nav>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={theme === "dark" ? "Switch to the light theme" : "Switch to the dark theme"} title={theme === "dark" ? "Light theme" : "Dark theme"}>
      {theme === "dark" ? <IconSun /> : <IconMoon />}
    </button>
  );
}

/** Basic or Advanced, for every page at once. Advanced adds pages to the header and depth to each page. */
function ModeToggle() {
  const [mode, setMode] = useMode();
  return (
    <div className="mode">
      <Segmented
        label="Layout"
        size="sm"
        value={mode}
        onChange={setMode}
        options={[
          { value: "basic", label: "Basic" },
          { value: "advanced", label: "Advanced" },
        ]}
      />
    </div>
  );
}

/** The network and the oracle in one control: the dot is the price feed's state, so it answers both "where am I" and "is the oracle alive". */
function NetworkMenu() {
  const { chainId, setChainId, snap } = useApp();
  const now = useNow(1000);
  const deployed = !!DEPLOYMENTS[chainId];
  const feed = deployed ? feedView(snap, now) : null;
  const feedText = !feed
    ? "None on this network"
    : feed.state === "live"
      ? `Live, ${feed.age} ago`
      : feed.state === "stale"
        ? feed.age
          ? `Stale, last post ${feed.age} ago`
          : "Stale"
        : feed.state === "frozen"
          ? "Not updating"
          : "Loading";
  const explorer = chainById(chainId)?.blockExplorers?.default.url;
  return (
    <Popover
      label="Network"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          className="hctl hctl--net"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="true"
          aria-label={`${CHAIN_LABEL[chainId]}, price feed: ${feedText.toLowerCase()}`}
          data-pop-trigger
        >
          <span className="live-dot" data-state={feed ? FEED_DOT[feed.state] : "idle"} aria-hidden="true" />
          <span className="hctl__label">{CHAIN_LABEL[chainId]}</span>
          <IconChevronDown />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="menu-head">
            <strong>{CHAIN_LABEL[chainId]}</strong>
            <span>Chain {chainId}</span>
          </div>
          <div className="menu-row">
            <span>Price feed</span>
            <span>{feedText}</span>
          </div>
          {SELECTABLE_CHAINS.length > 1 && (
            <>
              <div className="menu-sep" />
              <div role="group" aria-label="Networks">
                {SELECTABLE_CHAINS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-current={id === chainId ? "true" : undefined}
                    className="menu-item"
                    onClick={() => {
                      setChainId(id);
                      close();
                    }}
                  >
                    <span>{CHAIN_LABEL[id]}</span>
                    <small>{DEPLOYMENTS[id] ? `Chain ${id}` : "Not deployed yet"}</small>
                  </button>
                ))}
              </div>
            </>
          )}
          {explorer && (
            <>
              <div className="menu-sep" />
              <a className="menu-item" href={explorer} target="_blank" rel="noreferrer">
                <span>Block explorer</span>
                <IconExternal />
              </a>
            </>
          )}
        </>
      )}
    </Popover>
  );
}
