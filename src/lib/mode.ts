import { useCallback, useSyncExternalStore } from "react";

/**
 * The layout the whole app is in. Basic is the short version of every page: what you need to place an order and see how it is
 * going. Advanced is the full one, with the extra pages in the header, deeper tables and the exchange's own chart. One switch in
 * the header sets it for every page, and the browser remembers it.
 */
export type Mode = "basic" | "advanced";

const KEY = "twoprint.mode";
const OLD_KEY = "twoprint.tradeMode"; // before the switch moved to the header, only the Trade page had one

let current: Mode = read();
const listeners = new Set<() => void>();

function read(): Mode {
  try {
    const v = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY);
    return v === "advanced" ? "advanced" : "basic";
  } catch {
    return "basic";
  }
}

function set(next: Mode) {
  if (next === current) return;
  current = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* not remembered: the choice lasts for this page view */
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  // Another tab of the app changed it.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      current = read();
      fn();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

export function useMode(): [Mode, (m: Mode) => void] {
  const mode = useSyncExternalStore(subscribe, () => current, () => "basic" as Mode);
  const setMode = useCallback((m: Mode) => set(m), []);
  return [mode, setMode];
}
