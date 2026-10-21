import { useMemo, useSyncExternalStore } from "react";
import type { Mode } from "./mode";

export type Route = "home" | "docs" | "trade" | "markets" | "portfolio" | "activity" | "house" | "fees" | "funds" | "netsplit" | "compare";

export interface Page {
  route: Exclude<Route, "home" | "docs">;
  label: string;
  /** A page that only the Advanced layout lists in the header. Its address still works in Basic, and opens Advanced. */
  advanced?: boolean;
  /** An Advanced page the header keeps under "More" at every width: eight tabs and the account do not fit one bar. */
  minor?: boolean;
  /** A page reached by its address only. The header does not list it, but its address works and opens Advanced. */
  unlisted?: boolean;
}

/** Every page of the app, in the order the header lists them. */
export const PAGES: Page[] = [
  { route: "trade", label: "Trade" },
  { route: "markets", label: "Markets", advanced: true },
  { route: "portfolio", label: "Portfolio" },
  { route: "activity", label: "Activity", advanced: true },
  { route: "house", label: "House" },
  { route: "fees", label: "Fees", advanced: true, minor: true },
  { route: "funds", label: "Funds", advanced: true, minor: true },
  { route: "netsplit", label: "Net Split", advanced: true, minor: true },
  { route: "compare", label: "vs Papertrade", advanced: true, unlisted: true },
];

/** The pages the header lists in a layout: three in Basic, every listed one in Advanced. */
export const pagesFor = (mode: Mode): Page[] => PAGES.filter((p) => !p.unlisted && (!p.advanced || mode === "advanced"));

export const isAdvancedPage = (route: Route): boolean => PAGES.some((p) => p.route === route && p.advanced);

/** Addresses that moved. Links to the old ones still arrive in the right place. */
const MOVED: Record<string, string> = {
  receipts: "portfolio/history",
  "money-map": "funds",
  "net-split": "netsplit",
  "portfolio/funds": "funds",
  "portfolio/receipts": "portfolio/history",
  "house/fees": "fees",
  "house/joint/fees": "fees",
  "house/joint/net-split": "netsplit",
};

/**
 * Hash routing keeps the app deployable on any static host. A page can have more segments for its tab or view
 * (#/portfolio/history, #/house/crypto/risk). The docs page's sections use #/docs?s=<section>; the home page's old section
 * anchors (#/?s=<section>) still parse, and the app sends them on to the same section of the docs.
 */
export function parseHash(hash: string): { route: Route; sub: string | null; section: string | null } {
  const raw = hash.replace(/^#\/?/, "");
  const [pathRaw, query = ""] = raw.split("?");
  const [head, ...rest] = (MOVED[pathRaw] ?? pathRaw).split("/");
  const route = head === "docs" || PAGES.some((p) => p.route === head) ? (head as Route) : "home";
  // Whatever follows the page's name, such as "crypto/risk". The page reads its own tabs and views from it.
  const sub = route === "home" || route === "docs" ? null : rest.filter(Boolean).join("/") || null;
  return { route, sub, section: new URLSearchParams(query).get("s") };
}

/** The address of a page, with a section for the home and docs pages or a tab or view for the others. */
export function href(route: Route, part?: string): string {
  if (route === "home") return part ? `#/?s=${part}` : "#/";
  if (route === "docs") return part ? `#/docs?s=${part}` : "#/docs";
  return part ? `#/${route}/${part}` : `#/${route}`;
}

export function navigate(route: Route, part?: string) {
  window.location.hash = href(route, part);
}

/**
 * Scrolls a section of the page in view (the docs, or the home page) to the top and puts it in the URL. Smooth, unless the person
 * prefers reduced motion.
 */
export function scrollToSection(id: string): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  history.replaceState(null, "", href(parseHash(window.location.hash).route === "docs" ? "docs" : "home", id));
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
  return true;
}

function subscribe(fn: () => void) {
  window.addEventListener("hashchange", fn);
  return () => window.removeEventListener("hashchange", fn);
}

export function useRoute() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => "");
  return useMemo(() => parseHash(hash), [hash]);
}
