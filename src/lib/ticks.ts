// Axis ticks for the charts: round numbers a reader can take in at a glance.

const STEPS = [1, 2, 2.5, 5, 10];

/**
 * The gap between ticks: 1, 2, 2.5 or 5 times a power of ten. It is the largest of those that does not exceed the even split
 * (`span / target`) by more than a quarter, so an axis comes out a little finer than asked for rather than a little coarser.
 */
export function niceStep(span: number, target: number): number {
  if (!(span > 0) || !(target > 0)) return 1;
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  let best = STEPS[0];
  for (const s of STEPS) if (s <= norm * 1.25) best = s;
  return best * mag;
}

/** How many decimals it takes to print a step exactly (0.25 needs 2, 20 needs 0). */
export function stepDecimals(step: number): number {
  for (let dp = 0; dp < 8; dp++) if (Math.abs(step * 10 ** dp - Math.round(step * 10 ** dp)) < 1e-9) return dp;
  return 8;
}

/** Ticks at multiples of a nice step inside [lo, hi], about `target` of them. */
export function niceTicks(lo: number, hi: number, target: number): { ticks: number[]; step: number } {
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) return { ticks: [], step: 1 };
  if (hi === lo) return { ticks: [lo], step: 1 };
  const step = niceStep(hi - lo, target);
  const dp = stepDecimals(step);
  const ticks: number[] = [];
  for (let k = Math.ceil(lo / step - 1e-9); k * step <= hi + step * 1e-9; k++) ticks.push(Number((k * step).toFixed(dp)));
  return { ticks, step };
}

/** A tick value as an axis label, with a real minus sign and grouped thousands. */
export function tickLabel(v: number, dp: number): string {
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return v < 0 && Number(s.replace(/,/g, "")) !== 0 ? `−${s}` : s;
}
