// The scripted walks behind the landing page's liquidation picture. Prices are offsets in basis points from the entry, invented for
// illustration. The rule they show is the real one: one price update past the level costs the premium, and a second in a row
// liquidates.

/** Price updates in every walk, so the two share one length. */
export const STRIP_PRINTS = 49;

export interface StripMark {
  idx: number;
  label: string;
  tone: "breach";
}
export interface StripScenario {
  id: "wick" | "two";
  /** Offsets from the entry in bp, one per price update. */
  prints: number[];
  /** The updates past the level, in order. The first is where the story starts. */
  marks: StripMark[];
}

/** A small seeded generator, so the illustration is identical on every load. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Offsets that wander about the entry the way a quiet market does: a few bp per update, about 6 bp either way. `floor`
 * keeps the wander well clear of the liquidation level, so nothing in the quiet stretch can be mistaken for a breach.
 */
function quiet(n: number, seed: number, floor: number): number[] {
  const rand = rng(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  const out = [0];
  for (let i = 1; i < n; i++) out.push(Math.round(Math.max(floor, out[i - 1] * 0.86 + gauss() * 3) * 10) / 10);
  return out;
}

const scaled = (levelBp: number, ratios: number[]) => ratios.map((r) => -Math.round(levelBp * r));

/** The two walks for a position whose liquidation level sits `levelBp` below its entry. */
export function stripScenarios({ levelBp }: { levelBp: number }): StripScenario[] {
  const floor = -0.4 * levelBp;

  // One update beyond the level, then straight back.
  const W = 36;
  const [wickBp, backBp] = scaled(levelBp, [1.5, 0.25]);
  const wick: StripScenario = {
    id: "wick",
    prints: [...quiet(W, 11, floor), wickBp, backBp, ...[-14, -8, -3, 2, 0, 4, 2, -1, 2, 3, 1]].slice(0, STRIP_PRINTS),
    marks: [{ idx: W, label: "Beyond level", tone: "breach" }],
  };

  // Two updates in a row beyond it.
  const T = 36;
  const slide = scaled(levelBp, [0.45, 1.38, 1.57, 1.7, 1.45, 1.2, 1.02, 0.86, 0.74, 0.66, 0.6, 0.55, 0.5, 0.46]);
  const two: StripScenario = {
    id: "two",
    prints: [...quiet(T - 1, 23, floor), ...slide].slice(0, STRIP_PRINTS),
    marks: [
      { idx: T, label: "Beyond level", tone: "breach" },
      { idx: T + 1, label: "Liquidated", tone: "breach" },
    ],
  };

  return [wick, two];
}
