import { createContext, useContext } from "react";
import type { Address } from "viem";
import type { ChainId, Deployment } from "./config/chains";
import type { MarketDef } from "./config/markets";
import type { DevStatus, PositionRecord, PrintEv, Snapshot } from "./hooks/data";
import type { Ledger } from "./hooks/data";

export interface AppState {
  chainId: ChainId;
  setChainId: (c: ChainId) => void;
  deployment: Deployment | null;
  snap: Snapshot | undefined;
  /** First read error from the snapshot or the event ledger, if any. */
  readError: string | null;
  ledger: Ledger | null;
  /** Whether the event ledger has caught up with the chain. Until it has, "nothing yet" would be a guess. */
  ledgerReady: boolean;
  positions: PositionRecord[];
  mine: PositionRecord[];
  prints: [PrintEv[], PrintEv[]];
  address: Address | undefined;
  /** The contract index of the market the venue is showing: the selected one when it is live, else the last live one. */
  market: number;
  setMarket: (m: number) => void;
  /** The market picked in the selector, live or not. */
  selected: MarketDef;
  selectMarket: (id: string) => void;
  /** Whether the deployed contracts carry the selected market. */
  marketLive: boolean;
  focus: PositionRecord | undefined;
  focusId: bigint | null;
  /** When the focus was last picked, in performance.now() milliseconds. */
  focusAt: number;
  setFocusId: (id: bigint | null) => void;
  /** Whether the order card is open as a dialog. */
  orderOpen: boolean;
  /** Opens the order card on this order. */
  openOrder: (id: bigint) => void;
  closeOrder: () => void;
  dev: DevStatus | null | undefined;
  /** Opens the Hyperliquid-history verification dialog. */
  openVerify: () => void;
  /** Opens the list of who has power over Twoprint and what each of them can and cannot do. */
  openTrust: () => void;
}

export const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppContext.Provider>");
  return ctx;
}
