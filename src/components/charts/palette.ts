// The app's colours as the canvas charts need them: plain strings read from the design tokens, so the charts follow the theme
// and no colour is written down twice.

export interface Palette {
  ink: string;
  muted: string;
  faint: string;
  grid: string;
  line: string;
  line2: string;
  brand: string;
  brandStrong: string;
  long: string;
  short: string;
  slip: string;
  paper: string;
  font: string;
  dark: boolean;
}

/** The tokens in force now. Call it again after the theme changes. */
export function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    ink: v("--ink"),
    muted: v("--muted"),
    faint: v("--faint"),
    grid: v("--chart-grid"),
    line: v("--line"),
    line2: v("--line-2"),
    brand: v("--brand"),
    brandStrong: v("--brand-strong"),
    long: v("--long"),
    short: v("--short"),
    slip: v("--slip"),
    paper: v("--paper"),
    font: v("--font"),
    dark: document.documentElement.dataset.theme === "dark",
  };
}

/** A colour from the palette (hex, rgb or rgba) at the given opacity, as the rgba() string a canvas takes. */
export function rgba(color: string, alpha: number): string {
  const c = color.trim();
  let r = 0;
  let g = 0;
  let b = 0;
  if (c.startsWith("#")) {
    const h = c.length === 4 ? [...c.slice(1)].map((x) => x + x).join("") : c.slice(1, 7);
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else {
    const m = c.match(/[\d.]+/g);
    if (m) [r, g, b] = m.map(Number);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
