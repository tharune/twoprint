import { defineChain, type Address } from "viem";
import anvilDeployment from "./deployments/31337.json";
import elysiumDeployment from "./deployments/99801.json";
import { DEV } from "./dev";

/** Build-time settings (.env.example lists them). `?.`: this file also loads outside Vite (node tests, scripts). */
const env = (name: string): string | undefined => (import.meta.env?.[name] as string | undefined) || undefined;

/** An override from the environment is used only if it points at this machine, so "Local anvil" can never mean a remote node. */
function loopbackUrl(v: string | undefined, fallback: string): string {
  try {
    return v && ["127.0.0.1", "localhost", "[::1]"].includes(new URL(v).hostname) ? v : fallback;
  } catch {
    return fallback;
  }
}

/**
 * The app's own anvil. Port 8547 on purpose, so it never collides with a node already on 8545 (viem's `foundry` chain) or 8546.
 * VITE_ANVIL_RPC runs a second copy of the app against another local node (the dev scripts take the same address as RPC_URL).
 * Dev server only: nothing in a production build refers to it (see DEV), and the PURE mark lets the bundler drop the call.
 */
export const anvilLocal = /* @__PURE__ */ defineChain({
  id: 31337,
  name: "Anvil (local)",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [/* @__PURE__ */ loopbackUrl(env("VITE_ANVIL_RPC"), "http://127.0.0.1:8547")] } },
  testnet: true,
});

/**
 * Elysium RPC. VITE_ELYSIUM_RPC points the same build at another endpoint, e.g. a local `anvil --fork-url` of 99801 for a
 * rehearsal; a wallet that adds the chain from the app is handed this URL too. (`?.`: also loads outside Vite.) Never a keyed
 * URL in a build that leaves this machine: it ships in the bundle and goes to wallet_addEthereumChain. Throttling on the public
 * endpoint is handled in wagmi.ts instead.
 */
export const ELYSIUM_RPC_OVERRIDE: string | undefined = env("VITE_ELYSIUM_RPC");
const ELYSIUM_RPC = ELYSIUM_RPC_OVERRIDE ?? "https://testnet-rpc.elysium.kinetiq.xyz";

/** An RPC URL as the page shows it: host[:port] only. A keyed URL carries its key in the path, the query or user:pass@. */
export function rpcHost(url: string | undefined): string {
  try {
    return new URL(url ?? "").host;
  } catch {
    return "an unparseable RPC URL";
  }
}

export const elysiumTestnet = defineChain({
  id: 99801,
  name: "Elysium testnet",
  nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
  rpcUrls: { default: { http: [ELYSIUM_RPC] } },
  // The explorer UI lives under /testnet-explorer (/tx/<hash>, /address/<addr>); the bare domain's /tx and /address
  // pages are 404s. The Blockscout API stays at https://elysium.kinetiq.xyz/api. VITE_ELYSIUM_EXPLORER_URL replaces the UI base.
  blockExplorers: { default: { name: "Blockscout", url: (env("VITE_ELYSIUM_EXPLORER_URL") ?? "https://elysium.kinetiq.xyz/testnet-explorer").replace(/\/+$/, "") } },
  contracts: { multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" } },
  testnet: true,
});

/**
 * The chains this build knows. The types always list both, so the views compile the same way everywhere; a production build
 * serves Elysium only (the local node exists on the dev server alone), so `chainById(31337)` is undefined there.
 */
const CHAINS = (DEV ? [anvilLocal, elysiumTestnet] : [elysiumTestnet]) as unknown as readonly [typeof anvilLocal, typeof elysiumTestnet];
export type ChainId = (typeof CHAINS)[number]["id"];

export interface Deployment {
  chainId: number;
  TestUSDC: Address;
  PriceRing: Address;
  TierRegistry: Address;
  HouseVault: Address;
  FeeRouter: Address;
  PositionManager: Address;
  /** read-only quote helper (quoteOpen moved here from PositionManager) */
  PositionLens: Address;
  PriceSigner?: Address;
  Attester?: Address;
  /** block to start the event scan from (0 on anvil) */
  deployBlock?: number;
  /** DEMO buyback pool (99801 only): the swap-and-burn adapter FeeRouter spends fees through */
  BuybackAdapter?: Address;
  DemoToken?: Address;
  DemoPair?: Address;
}

const KEYS = ["TestUSDC", "PriceRing", "TierRegistry", "HouseVault", "FeeRouter", "PositionManager", "PositionLens"] as const;

function asDeployment(raw: Record<string, unknown>): Deployment | null {
  for (const k of KEYS) if (typeof raw[k] !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(raw[k] as string)) return null;
  return raw as unknown as Deployment;
}

/**
 * Addresses per chain. Elysium stays null until its JSON has every address, so all writes there stay disabled. The local node's
 * addresses (31337.json, supplied separately) are read on the dev server only.
 */
export const DEPLOYMENTS: Record<ChainId, Deployment | null> = {
  31337: DEV ? asDeployment(anvilDeployment as Record<string, unknown>) : null,
  99801: asDeployment(elysiumDeployment as Record<string, unknown>),
};

export const chainById = (id: number) => CHAINS.find((c) => c.id === id);

export const CHAIN_LABEL: Record<ChainId, string> = { 31337: "Local anvil", 99801: "Elysium testnet" };

/**
 * A local anvil is only reachable from a page served from this machine, and only the dev server offers developer tools: a
 * production build is never "local", even when `vite preview` serves it from 127.0.0.1.
 */
export const IS_LOCAL_HOST = DEV && typeof window !== "undefined" && ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);

const query = (name: string) => (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get(name) : null);

/** The local node is a developer's tool: it is offered only on this machine, and only when asked for with `?chain=31337` or `?bench`. */
export const SHOW_LOCAL_NODE = IS_LOCAL_HOST && (query("chain") === "31337" || query("bench") !== null);

/** Networks the person can pick: Elysium testnet, and the local node when it is asked for. */
export const SELECTABLE_CHAINS: ChainId[] = SHOW_LOCAL_NODE ? [31337, 99801] : [99801];

/** `?chain=99801|31337` picks a selectable network (the harness and rehearsals use it); otherwise Elysium once its deployment file is filled in, else the local node while developing. */
export function defaultChain(): ChainId {
  const asked = Number(query("chain"));
  const pick = SELECTABLE_CHAINS.find((c) => c === asked);
  if (pick !== undefined) return pick;
  if (DEPLOYMENTS[99801]) return 99801;
  return IS_LOCAL_HOST ? 31337 : 99801;
}

export function explorerTx(chainId: number, hash: string): string | null {
  const c = chainById(chainId);
  const base = c && "blockExplorers" in c ? c.blockExplorers?.default.url : undefined;
  return base ? `${base}/tx/${hash}` : null;
}
export function explorerAddress(chainId: number, addr: string): string | null {
  const c = chainById(chainId);
  const base = c && "blockExplorers" in c ? c.blockExplorers?.default.url : undefined;
  return base ? `${base}/address/${addr}` : null;
}

/**
 * Optional local development control endpoint. Local anvil only; VITE_DEV_CONTROL_URL points at another
 * one. Empty in a production build: the control calls can only be reached from the local node's views, which that build has no
 * way to select, and an empty base would never name a loopback address.
 */
export const DEV_CONTROL_URL = DEV ? loopbackUrl(env("VITE_DEV_CONTROL_URL"), "http://127.0.0.1:8548").replace(/\/+$/, "") : "";

/** anvil's default account #3: the in-app "dev account" signs through anvil's unlocked accounts (no key in the bundle). Dev server only. */
export const ANVIL_DEV_ACCOUNT: Address = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
