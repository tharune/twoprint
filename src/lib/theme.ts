import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const KEY = "twoprint.theme";
const META_COLOR: Record<Theme, string> = { light: "#f2f6f7", dark: "#071013" };

function current(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", META_COLOR[theme]);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* storage unavailable: the choice lasts for this page view only */
  }
}

function subscribe(fn: () => void) {
  const watch = new MutationObserver(fn);
  watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => watch.disconnect();
}

/** The theme in force, for anything drawn outside the stylesheet (an embedded chart). It follows the toggle wherever it is pressed. */
export const useThemeName = (): Theme => useSyncExternalStore(subscribe, current, () => "light");

/** The paper theme is the default. The choice is remembered per browser; index.html applies it before first paint. */
export function useTheme() {
  const theme = useThemeName();
  const toggle = useCallback(() => apply(current() === "dark" ? "light" : "dark"), []);
  return { theme, toggle };
}
