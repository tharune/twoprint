import { useCallback, useState } from "react";

/**
 * A choice remembered in this browser, such as a layout or a tab. Storage can be unavailable (private windows, blocked
 * site data), so a failed read gives the default and a failed write is dropped: the choice then lasts for the page view.
 */
export function usePref<T extends string>(key: string, allowed: readonly T[], fallback: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return allowed.includes(stored as T) ? (stored as T) : fallback;
    } catch {
      return fallback;
    }
  });
  const set = useCallback(
    (v: T) => {
      setValue(v);
      try {
        localStorage.setItem(key, v);
      } catch {
        /* not remembered */
      }
    },
    [key],
  );
  return [value, set];
}
