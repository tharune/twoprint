import type { ReactNode } from "react";
import { useApp } from "../app-context";
import { PageLoading } from "../components/Skeleton";
import { PageHeader, Segmented, Stat, Tabs } from "../components/ui";
import { CLASSES, classOf, isLiveMarket, marketsOf, type AssetClass } from "../config/markets";
import { capShare } from "../lib/feed";
import { usdc, usdcSigned } from "../lib/format";
import { useMode } from "../lib/mode";
import { houseTradingPnl } from "../lib/netsplit";
import { navigate } from "../lib/router";
import { HousePnl, OpenInterest, PnlByMarket, Settlements } from "./house/Charts";
import { LedgerPanel } from "./house/Ledger";
import { MarketsTable } from "./house/Markets";
import { RiskPanel } from "./house/Risk";
import { VaultsTable, classInterest } from "./house/Vaults";

type Scope = "joint" | AssetClass;
const SCOPES: readonly string[] = ["joint", ...CLASSES.map((c) => c.id)];

/** `joint`, `joint/vaults`, `crypto`, `crypto/risk`: which vault the page shows, and which of its tabs. */
function parse(path: string | null | undefined): { scope: Scope; tab: string | null } {
  const [a, b] = (path ?? "").split("/");
  return { scope: (SCOPES.includes(a) ? a : "joint") as Scope, tab: b || null };
}

function Kpis({ items }: { items: { label: string; value: ReactNode; sub?: ReactNode; tone?: "long" | "short" }[] }) {
  return (
    <ul className="cards">
      {items.map((it) => (
        <li key={it.label} className="panel kpi">
          <Stat label={it.label} value={it.value} sub={it.sub} tone={it.tone} />
        </li>
      ))}
    </ul>
  );
}

/**
 * The other side of every trade. The joint view adds the vaults up; each kind of market has a view of its own, because each has
 * its own vault. A vault the contracts do not carry yet is shown as what it will hold, with the venue's own depth for it. Basic is
 * one page for each: the figures, the charts and one table. Advanced splits it into tabs and adds the risk checks and the ledger.
 */
export function House({ path }: { path?: string | null }) {
  const { snap } = useApp();
  const { scope, tab } = parse(path);
  const go = (s: Scope) => navigate("house", s === "joint" ? undefined : s);
  return (
    <div className="wrap">
      <PageHeader title="House" lede="The house takes the other side of every trade. Each kind of market is meant to have its own vault; only the crypto vault is deployed." />
      <div className="pagetabs">
        <Tabs
          label="Vault"
          idPrefix="house"
          value={scope}
          onChange={go}
          tabs={[{ value: "joint" as Scope, label: "Joint" }, ...CLASSES.map((c) => ({ value: c.id as Scope, label: c.label }))]}
        />
      </div>
      <div role="tabpanel" id={`house-panel-${scope}`} aria-labelledby={`house-tab-${scope}`} className="stackp">
        {!snap ? <PageLoading /> : scope === "joint" ? <Joint tab={tab} /> : <Vault cls={scope} tab={tab} />}
      </div>
    </div>
  );
}

const JOINT_TABS = ["overview", "vaults"] as const;
type JointTab = (typeof JOINT_TABS)[number];

function Joint({ tab }: { tab: string | null }) {
  const { snap } = useApp();
  const [mode] = useMode();
  const advanced = mode === "advanced";
  const s = snap!;
  const sub: JointTab = (JOINT_TABS as readonly string[]).includes(tab ?? "") ? (tab as JointTab) : "overview";
  const pnl = houseTradingPnl(s.vault);
  const live = CLASSES.filter((c) => marketsOf(c.id).some(isLiveMarket));
  const interest = live.reduce(
    (a, c) => {
      const x = classInterest(c.id, s.markets);
      return { oi: a.oi + x.oi, cap: a.cap + x.cap };
    },
    { oi: 0n, cap: 0n },
  );
  const overview = (
    <>
      <div className="cols2">
        <HousePnl title="House trading P&L" />
        <OpenInterest />
      </div>
      {advanced && (
        <div className="cols2 cols2--top">
          <Settlements />
          <PnlByMarket />
        </div>
      )}
    </>
  );
  return (
    <>
      <Kpis
        items={[
          { label: "In the vault", value: `${usdc(s.vault.equity, 2)} tUSDC`, sub: `${live.length} of ${CLASSES.length} vaults deployed` },
          { label: "House P&L", value: `${usdcSigned(pnl, 2)} tUSDC`, tone: pnl > 0n ? "long" : pnl < 0n ? "short" : undefined, sub: "From trading, before fees" },
          { label: "Open interest", value: `${usdc(interest.oi, 0)} tUSDC`, sub: interest.cap > 0n ? `${capShare(interest.oi, interest.cap).toFixed(1)}% of its caps` : undefined },
          { label: "Fees held", value: `${usdc(s.fees.balance, 2)} tUSDC`, sub: "Kept apart from the vaults" },
        ]}
      />
      {!advanced ? (
        <>
          {overview}
          <VaultsTable />
        </>
      ) : (
        <>
          <Segmented
            label="Joint view"
            value={sub}
            onChange={(t) => navigate("house", t === "overview" ? "joint" : `joint/${t}`)}
            options={[
              { value: "overview", label: "Overview" },
              { value: "vaults", label: "Vaults" },
            ]}
          />
          {sub === "overview" ? overview : <VaultsTable />}
        </>
      )}
    </>
  );
}

const VAULT_TABS = ["overview", "markets", "risk", "ledger"] as const;
type VaultTab = (typeof VAULT_TABS)[number];

function Vault({ cls, tab }: { cls: AssetClass; tab: string | null }) {
  const { snap } = useApp();
  const [mode] = useMode();
  const advanced = mode === "advanced";
  const c = classOf(cls);
  if (!marketsOf(cls).some(isLiveMarket)) {
    return (
      <>
        <section className="panel soon">
          <h2>The {c.label.toLowerCase()} vault is planned</h2>
          <p>Only the crypto vault is deployed so far. {c.label} would trade against a vault of its own, so a loss there wouldn’t reach the others. These are the markets it would hold, ranked by 24h volume on Hyperliquid.</p>
        </section>
        <MarketsTable cls={cls} />
      </>
    );
  }
  const s = snap!;
  const sub: VaultTab = (VAULT_TABS as readonly string[]).includes(tab ?? "") ? (tab as VaultTab) : "overview";
  const pnl = houseTradingPnl(s.vault);
  const { oi, cap } = classInterest(cls, s.markets);
  const overview = (
    <>
      <div className="cols2">
        <HousePnl cls={cls} title={`${c.label} house P&L`} />
        <OpenInterest cls={cls} />
      </div>
      {advanced && (
        <div className="cols2 cols2--top">
          <Settlements cls={cls} />
          <PnlByMarket />
        </div>
      )}
    </>
  );
  return (
    <>
      <Kpis
        items={[
          { label: "In the vault", value: `${usdc(s.vault.equity, 2)} tUSDC`, sub: `${c.vault}, ${s.vault.isCloseOnly ? "close-only" : "open"}` },
          { label: "House P&L", value: `${usdcSigned(pnl, 2)} tUSDC`, tone: pnl > 0n ? "long" : pnl < 0n ? "short" : undefined, sub: "From trading, before fees" },
          { label: "Open interest", value: `${usdc(oi, 0)} tUSDC`, sub: cap > 0n ? `${capShare(oi, cap).toFixed(1)}% of its caps` : undefined },
          { label: "Fees held", value: `${usdc(s.fees.balance, 2)} tUSDC`, sub: "Kept apart from the vaults" },
        ]}
      />
      {!advanced ? (
        <>
          {overview}
          <MarketsTable cls={cls} />
        </>
      ) : (
        <>
          <Segmented
            label={`${c.vault} view`}
            value={sub}
            onChange={(t) => navigate("house", t === "overview" ? cls : `${cls}/${t}`)}
            options={[
              { value: "overview", label: "Overview" },
              { value: "markets", label: "Markets" },
              { value: "risk", label: "Risk" },
              { value: "ledger", label: "Ledger" },
            ]}
          />
          {sub === "overview" && overview}
          {sub === "markets" && <MarketsTable cls={cls} />}
          {sub === "risk" && <RiskPanel />}
          {sub === "ledger" && <LedgerPanel />}
        </>
      )}
    </>
  );
}
