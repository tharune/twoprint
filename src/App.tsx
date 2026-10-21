import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAccount, useBlockNumber } from "wagmi";
import { AppContext, useApp, type AppState } from "./app-context";
import { DevStrip, SiteFooter } from "./components/Chrome";
import { SiteHeader } from "./components/Header";
import { OrderModal } from "./components/OrderModal";
import { Toasts } from "./components/Toasts";
import { TrustDialog } from "./components/TrustDialog";
import { VerifyTier } from "./components/VerifyTier";
import { Button, Notice, Receipt, ReceiptRow } from "./components/ui";
import { CHAIN_LABEL, DEPLOYMENTS, IS_LOCAL_HOST, chainById, defaultChain, rpcHost, type ChainId } from "./config/chains";
import { DEV } from "./config/dev";
import { DEPLOYED_MARKETS, marketAt, marketById } from "./config/markets";
import { isLive, useDevControl, useLedger, useSnapshot, type PositionRecord, type PrintEv } from "./hooks/data";
import { useMode } from "./lib/mode";
import { href, isAdvancedPage, navigate, useRoute, type Route } from "./lib/router";
import { Landing } from "./views/Landing";
import { PageLoading } from "./components/Skeleton";

// Every page of the app but the landing page loads when it is first visited, so a first visit downloads little more than the
// first screen. The landing page warms the Trade page's code while the visitor reads (see Landing).
const Activity = lazy(() => import("./views/Activity").then((m) => ({ default: m.Activity })));
const Compare = lazy(() => import("./views/Compare").then((m) => ({ default: m.Compare })));
const Docs = lazy(() => import("./views/Docs").then((m) => ({ default: m.Docs })));
const Fees = lazy(() => import("./views/Fees").then((m) => ({ default: m.Fees })));
const Funds = lazy(() => import("./views/Funds").then((m) => ({ default: m.Funds })));
const House = lazy(() => import("./views/House").then((m) => ({ default: m.House })));
const Markets = lazy(() => import("./views/Markets").then((m) => ({ default: m.Markets })));
const NetSplitPage = lazy(() => import("./views/NetSplitPage").then((m) => ({ default: m.NetSplitPage })));
const Portfolio = lazy(() => import("./views/Portfolio").then((m) => ({ default: m.Portfolio })));
const Trade = lazy(() => import("./views/Trade").then((m) => ({ default: m.Trade })));

const NO_PRINTS: [PrintEv[], PrintEv[]] = [[], []];

export function App() {
  const { route, sub, section } = useRoute();
  const [mode, setMode] = useMode();
  const [chainId, setChain] = useState<ChainId>(defaultChain);
  const [market, setMarket] = useState(0);
  const [selectedId, setSelectedId] = useState(() => marketAt(0)!.id);
  const selected = marketById(selectedId) ?? marketAt(0)!;
  const marketLive = selected.index !== null && selected.index < DEPLOYED_MARKETS && selected.index === market;
  const selectMarket = useCallback((id: string) => {
    const def = marketById(id);
    if (!def) return;
    setSelectedId(def.id);
    if (def.index !== null && def.index < DEPLOYED_MARKETS) setMarket(def.index);
  }, []);
  const [picked, setPicked] = useState<{ id: bigint | null; at: number }>({ id: null, at: 0 });
  const focusId = picked.id;
  const setFocusId = useCallback((id: bigint | null) => setPicked({ id, at: performance.now() }), []);
  const [orderOpen, setOrderOpen] = useState(false);
  const openOrder = useCallback(
    (id: bigint) => {
      setFocusId(id);
      setOrderOpen(true);
    },
    [setFocusId],
  );
  const closeOrder = useCallback(() => setOrderOpen(false), []);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [trustOpen, setTrustOpen] = useState(false);
  const { address } = useAccount();

  const deployment = DEPLOYMENTS[chainId];
  const snapQ = useSnapshot(chainId, address);
  const snap = deployment ? snapQ.data : undefined;
  const { ledger, version } = useLedger(chainId);
  const dev = useDevControl(chainId === 31337 && !!deployment);

  const positions = useMemo(() => (ledger ? [...ledger.positions.values()] : []), [ledger, version]);
  const mine = useMemo(() => positions.filter((p) => address && p.trader.toLowerCase() === address.toLowerCase()), [positions, address]);
  const focus = useMemo(() => {
    let found: PositionRecord | undefined;
    if (focusId !== null) found = positions.find((p) => p.id === focusId);
    else {
      const live = mine.filter(isLive);
      found = [...(live.length ? live : mine)].sort((a, b) => Number(b.id - a.id))[0];
    }
    // The ledger updates a position in place, so readers that memoise on it get a copy to see each change.
    return found && { ...found };
  }, [focusId, positions, mine]);

  const setChainId = useCallback((c: ChainId) => {
    setChain(c);
    setFocusId(null);
  }, [setFocusId]);

  const readError = deployment ? ((snapQ.error as Error | null)?.message?.split("\n")[0] ?? ledger?.error ?? null) : null;

  const state: AppState = {
    chainId,
    setChainId,
    deployment,
    snap,
    readError,
    ledger,
    ledgerReady: !!ledger?.ready,
    positions,
    mine,
    prints: ledger?.prints ?? NO_PRINTS,
    address,
    market,
    setMarket,
    selected,
    selectMarket,
    marketLive,
    focus,
    focusId,
    focusAt: picked.at,
    setFocusId,
    orderOpen,
    openOrder,
    closeOrder,
    dev: dev.data,
    openVerify: () => setVerifyOpen(true),
    openTrust: () => setTrustOpen(true),
  };

  // Going to another page puts away an open order.
  useEffect(() => setOrderOpen(false), [route]);

  // A page only Advanced lists opens Advanced when you arrive at it, and Basic leaves it for the Trade page when you switch back.
  const seen = useRef<Route | null>(null);
  useEffect(() => {
    const arrived = seen.current !== route;
    seen.current = route;
    if (!isAdvancedPage(route) || mode === "advanced") return;
    if (arrived) setMode("advanced");
    else navigate("trade");
  }, [route, mode, setMode]);

  // Route changes start at the top; docs links scroll to their section. The home page's old section links (#/?s=fees) moved to
  // the docs, so they are sent on to the same section there.
  useEffect(() => {
    if (route === "home" && section) {
      window.location.replace(href("docs", section));
      return;
    }
    if (route === "docs" && section) {
      const el = document.getElementById(section);
      if (el) {
        el.scrollIntoView({ block: "start", behavior: "instant" });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [route, section]);

  let view: ReactNode;
  if (route === "home") view = <Landing />;
  else if (route === "docs")
    view = (
      <Suspense
        fallback={
          <div className="wrap">
            <PageLoading />
          </div>
        }
      >
        <Docs />
      </Suspense>
    );
  // The comparison works without a deployment: it falls back to Config.sol's parameters until the chain answers.
  else if (route === "compare")
    view = (
      <Suspense
        fallback={
          <div className="wrap">
            <PageLoading />
          </div>
        }
      >
        <Compare />
      </Suspense>
    );
  else
    view = (
      <ChainGate>
        <Suspense
          fallback={
            <div className="wrap">
              <PageLoading />
            </div>
          }
        >
          {route === "trade" && <Trade />}
          {route === "markets" && <Markets />}
          {route === "portfolio" && <Portfolio tab={sub} />}
          {route === "activity" && <Activity />}
          {route === "house" && <House path={sub} />}
          {route === "fees" && <Fees />}
          {route === "funds" && <Funds />}
          {route === "netsplit" && <NetSplitPage />}
        </Suspense>
      </ChainGate>
    );

  return (
    <AppContext.Provider value={state}>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>
      <DevStrip />
      <SiteHeader />
      <main id="main" tabIndex={-1} className={route === "home" || route === "docs" ? "main main--home" : "main main--app"}>
        {view}
      </main>
      <SiteFooter />
      <OrderModal />
      <VerifyTier open={verifyOpen} onClose={() => setVerifyOpen(false)} />
      <TrustDialog open={trustOpen} onClose={() => setTrustOpen(false)} />
      <Toasts />
    </AppContext.Provider>
  );
}

/** Shows the not-deployed and cannot-read-chain states instead of a view that has no data to show. */
function ChainGate({ children }: { children: ReactNode }) {
  const { deployment, readError, chainId } = useApp();
  if (!deployment) return <NotDeployed />;
  return (
    <>
      {readError && (
        <div className="wrap gate-notice">
          <Notice tone="error" title="Can't read the chain">
            {readError}.{" "}
            {DEV && chainId === 31337 ? (
              <>
                Is anvil running on {rpcHost(chainById(31337)?.rpcUrls.default.http[0])} with this deployment? Start it with <code>pnpm chain</code> and <code>pnpm deploy:local</code>.
              </>
            ) : (
              <>RPC: {rpcHost(chainById(chainId)?.rpcUrls.default.http[0])}</>
            )}
          </Notice>
        </div>
      )}
      {children}
    </>
  );
}

function NotDeployed() {
  const { chainId, setChainId } = useApp();
  const { data: block, error } = useBlockNumber({ chainId, watch: true });
  return (
    <section className="wrap gate">
      <h1 className="gate__title">Twoprint is not deployed on {CHAIN_LABEL[chainId]} yet</h1>
      <p className="gate__lede">Orders are disabled on this network until the contracts are deployed. The network itself is readable, so you can confirm it is up.</p>
      <Receipt label="Network status">
        <ReceiptRow label="Network">{CHAIN_LABEL[chainId]}</ReceiptRow>
        <ReceiptRow label="Chain id">{chainId}</ReceiptRow>
        <ReceiptRow label="Latest block">{error ? `Unreachable: ${error.message.split("\n")[0]}` : block !== undefined ? block.toString() : "Loading"}</ReceiptRow>
      </Receipt>
      <div className="gate__actions">
        {IS_LOCAL_HOST && (
          <Button onClick={() => setChainId(31337)}>Use the local test node</Button>
        )}
      </div>
      {IS_LOCAL_HOST && (
        <p className="gate__fine">
          For deployers: fill <code>src/config/deployments/99801.json</code> with the same keys as <code>31337.json</code> plus <code>deployBlock</code>, then rebuild. Every write stays disabled until all addresses are present.
        </p>
      )}
    </section>
  );
}
