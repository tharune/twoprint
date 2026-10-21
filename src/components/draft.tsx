import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useApp } from "../app-context";
import { useQuote } from "../hooks/data";
import { parseUsdc } from "../lib/format";
import { DEFAULT_PREMIUM_GUARD } from "../lib/protocol";

type Quote = NonNullable<ReturnType<typeof useQuote>["data"]>;

/** The order being put together in the ticket. The chart reads it too, so the quote is drawn before anything is committed. */
interface Draft {
  isLong: boolean;
  setIsLong: (v: boolean) => void;
  colStr: string;
  setColStr: (v: string) => void;
  lev: number;
  setLev: (v: number) => void;
  guard: number;
  setGuard: (v: number) => void;
  /** The highest leverage this account's tier allows. */
  maxLev: number;
  /** The leverage asked for, held to that cap. */
  leverage: number;
  /** The typed collateral, or null while it does not parse. */
  collateral: bigint | null;
  quote: Quote | undefined;
  /** True while the quote is for earlier inputs (it settles 300 ms after the last edit). */
  quoteStale: boolean;
  /** When the side, amount or leverage was last edited, in performance.now() milliseconds. */
  touchedAt: number;
}

const DraftContext = createContext<Draft | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const { chainId, snap, market } = useApp();
  const [isLong, setIsLongRaw] = useState(true);
  const [colStr, setColStrRaw] = useState("20");
  const [lev, setLevRaw] = useState(100);
  const [guard, setGuard] = useState(DEFAULT_PREMIUM_GUARD);
  const [touchedAt, setTouchedAt] = useState(0);
  const setIsLong = useCallback((v: boolean) => {
    setIsLongRaw(v);
    setTouchedAt(performance.now());
  }, []);
  const setColStr = useCallback((v: string) => {
    setColStrRaw(v);
    setTouchedAt(performance.now());
  }, []);
  const setLev = useCallback((v: number) => {
    setLevRaw(v);
    setTouchedAt(performance.now());
  }, []);

  const pm = snap?.pm;
  const tier = snap?.user?.tier ?? 0;
  const maxLev = pm ? (tier === 1 ? pm.maxLevVerified : pm.maxLevDefault) : 100;
  const leverage = Math.min(lev, maxLev);
  const collateral = parseUsdc(colStr);
  // One quote per settled input, not one per keystroke or slider step (each is an eth_call against a ~7/s shared budget).
  const qCollateral = useSettled(collateral, 300);
  const qLeverage = useSettled(leverage, 300);
  const quote = useQuote(chainId, market, isLong, qCollateral, qLeverage, snap?.markets[market]?.count ?? 0).data;
  const quoteStale = qCollateral !== collateral || qLeverage !== leverage; // the quote is for earlier inputs

  const value = useMemo<Draft>(
    () => ({ isLong, setIsLong, colStr, setColStr, lev, setLev, guard, setGuard, maxLev, leverage, collateral, quote, quoteStale, touchedAt }),
    [isLong, setIsLong, colStr, setColStr, lev, setLev, guard, maxLev, leverage, collateral, quote, quoteStale, touchedAt],
  );
  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft(): Draft {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error("useDraft must be used inside <DraftProvider>");
  return ctx;
}

/** `v` after it has held still for `ms`. The quote is an eth_call, and a slider drag changes the leverage ~60 times a second. */
function useSettled<T>(v: T, ms: number): T {
  const [x, setX] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setX(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return x;
}
