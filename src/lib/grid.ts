// Events happen at odd moments and a time chart wants an even grid. These put the one on the other without inventing anything:
// a running total is carried forward between its changes, and bars are sums of what happened inside each stretch.

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

const BUCKETS = [MINUTE, 2 * MINUTE, 5 * MINUTE, 10 * MINUTE, 15 * MINUTE, 30 * MINUTE, HOUR, 2 * HOUR, 3 * HOUR, 6 * HOUR, 12 * HOUR, DAY, 2 * DAY, 7 * DAY];

/**
 * The stretch a chart of events shows: from before the first event to now. It is never narrower than `min`, so one event a few
 * minutes ago still has some history around it, and the first event sits a little in from the edge, not on it.
 */
export function windowFor(first: number, now: number, min = 2 * HOUR): { from: number; to: number } {
  const span = Math.max(min, Math.max(0, now - first) * 1.25);
  return { from: now - span, to: now + span * 0.03 };
}

/** A round bucket size that spreads `span` over about `target` bars, or fewer. */
export function bucketSize(span: number, target = 48): number {
  for (const s of BUCKETS) if (span / s <= target) return s;
  return BUCKETS[BUCKETS.length - 1];
}

/**
 * A running total sampled on a regular grid. The value at each grid moment is the last change at or before it; before the first
 * change it is `before`. The grid ends at the first moment at or after `to`, so the newest value always reaches the edge.
 */
export function sampleSteps(steps: readonly { t: number; v: number }[], from: number, to: number, size: number, before = 0): { t: number; v: number }[] {
  const start = Math.floor(from / size) * size;
  const out: { t: number; v: number }[] = [];
  let i = 0;
  let v = before;
  for (let t = start; ; t += size) {
    while (i < steps.length && steps[i].t <= t) v = steps[i++].v;
    out.push({ t, v });
    if (t >= to) break;
  }
  return out;
}

/** What happened in each bucket of a regular grid, summed, with the count; a bucket with nothing in it is zero. */
export function bucketEvents(events: readonly { t: number; v: number }[], from: number, to: number, size: number): { t: number; v: number; n: number }[] {
  const start = Math.floor(from / size) * size;
  const count = Math.max(1, Math.floor((to - start) / size) + 1);
  const out = Array.from({ length: count }, (_, k) => ({ t: start + k * size, v: 0, n: 0 }));
  for (const e of events) {
    const k = Math.floor((e.t - start) / size);
    if (k >= 0 && k < count) {
      out[k].v += e.v;
      out[k].n++;
    }
  }
  return out;
}

/**
 * Evenly spaced stand-in moments for things that come in a sequence and not at a time (one bar for each order), with the
 * names to print on the axis in their place, and the way back from a moment to the thing it stands for.
 */
export function sequence(labels: readonly string[]): { times: number[]; name: (time: number) => string; index: (time: number) => number } {
  // One calendar year apart. The axis picks out in bold the labels whose moment is the biggest change of clock from the one before:
  // with minutes apart that is an arbitrary few of them, with years it is every one, and the names all print alike.
  const first = 2000;
  const index = (time: number) => new Date(time * 1000).getUTCFullYear() - first;
  return {
    times: labels.map((_, i) => Date.UTC(first + i, 0, 1) / 1000),
    name: (time) => labels[index(time)] ?? "",
    index,
  };
}
