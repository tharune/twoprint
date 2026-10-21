// Step lines for the landing page's pictures. The oracle's price arrives as prints, so a line through them holds each price
// until the next print lands, and turns a corner there. Never a smooth curve: a curve would show prices that never existed.

export interface Inset {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface StepGeometry {
  /** The step line through the values. */
  d: string;
  /** The same line closed down to the bottom edge of the plot, for a fill under it. */
  area: string;
  /** Where print i sits, left to right. */
  x: (i: number) => number;
  /** Where a value sits, bottom to top. */
  y: (v: number) => number;
}

const f = (v: number) => v.toFixed(1);

/**
 * A step line through `values`, scaled to fit w × h inside `inset`. Give `lo` and `hi` to fix the vertical range (so lines can be
 * compared or a reference line placed on it); otherwise the range is the values' own. A flat series is drawn at mid height.
 * Fewer than two values draw nothing.
 */
export function stepGeometry(values: number[], w: number, h: number, inset: Inset & { lo?: number; hi?: number } = {}): StepGeometry | null {
  const n = values.length;
  if (n < 2) return null;
  const { top = 0, right = 0, bottom = 0, left = 0 } = inset;
  let lo = inset.lo ?? Math.min(...values);
  let hi = inset.hi ?? Math.max(...values);
  if (hi - lo < 1e-9) {
    lo -= 0.5;
    hi += 0.5;
  }
  const innerW = w - left - right;
  const innerH = h - top - bottom;
  const x = (i: number) => left + (i / (n - 1)) * innerW;
  const y = (v: number) => top + (1 - (v - lo) / (hi - lo)) * innerH;
  let d = "";
  values.forEach((v, i) => (d += i === 0 ? `M${f(x(0))} ${f(y(v))}` : `H${f(x(i))}V${f(y(v))}`));
  return { d, area: `${d}V${f(top + innerH)}H${f(x(0))}Z`, x, y };
}

/** A small seeded generator, so a picture is identical on every load. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `n` values that wander the way a market does print to print: each one a random step from the last, about `step` either way. */
export function walk(n: number, seed: number, step = 1): number[] {
  const rand = seeded(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  const out = [0];
  for (let i = 1; i < n; i++) out.push(out[i - 1] + gauss() * step);
  return out;
}

/** The straight line through values `from` up to (not including) `to`: each point joined to the next, nothing smoothed. */
export function linePathRange(g: StepGeometry, values: number[], from: number, to: number): string {
  let d = "";
  const start = Math.max(0, from);
  for (let i = start; i < Math.min(to, values.length); i++) d += `${i === start ? "M" : "L"}${f(g.x(i))} ${f(g.y(values[i]))}`;
  return d;
}

/**
 * The step line as far as a playhead has drawn it, and where the playhead is. `pos` is a position along the series (3.5 is halfway
 * between print 3 and print 4): between two prints the line runs level first, then up or down, so the point leaves the line behind it
 * and is never ahead of it. `from` starts the trail at a later print.
 */
export function stepTrail(g: StepGeometry, values: number[], pos: number, from = 0): { d: string; x: number; y: number } {
  const last = values.length - 1;
  const p = Math.min(Math.max(pos, from), last);
  const i = Math.floor(p);
  const u = p - i;
  let d = "";
  for (let k = from; k <= i; k++) d += k === from ? `M${f(g.x(k))} ${f(g.y(values[k]))}` : `H${f(g.x(k))}V${f(g.y(values[k]))}`;
  let x = g.x(i);
  let y = g.y(values[i]);
  if (u > 0 && i < last) {
    const nx = g.x(i + 1);
    const ny = g.y(values[i + 1]);
    if (u < 0.5) {
      x += (nx - x) * (u * 2);
      d += `H${f(x)}`;
    } else {
      d += `H${f(nx)}`;
      x = nx;
      y += (ny - y) * (u * 2 - 1);
      d += `V${f(y)}`;
    }
  }
  return { d, x, y };
}
