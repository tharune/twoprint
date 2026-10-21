// The FeeRouter's fee split (contracts/src/FeeRouter.sol). legMask bit i enables leg i; the enabled legs take equal
// parts, round robin over each base unit of fees. Config.FEE_LEG_MASK = 0x07: a third each.
export const LEG_NAMES = ["TWOPRINT buyback", "KNTQ buyback", "team/ops"] as const;
const LEG_PHRASES = ["a TWOPRINT buyback", "a KNTQ buyback", "team/ops"] as const;
/** IFeeRouter.Leg.TEAM_OPS */
export const OPS_LEG = 2;

export function enabledLegs(mask: number): number[] {
  return [0, 1, 2].filter((i) => (mask >> i) & 1);
}

export function shareLabel(mask: number): string {
  const n = enabledLegs(mask).length;
  return n === 3 ? "⅓" : n === 2 ? "½" : "all";
}

/** e.g. "⅓ TWOPRINT buyback · ⅓ KNTQ buyback · ⅓ team/ops" */
export function splitLine(mask: number): string {
  const s = shareLabel(mask);
  return enabledLegs(mask)
    .map((i) => `${s} ${LEG_NAMES[i]}`)
    .join(" · ");
}

/** "a TWOPRINT buyback, a KNTQ buyback and team/ops" */
function legList(mask: number): string {
  const p = enabledLegs(mask).map((i) => LEG_PHRASES[i]);
  return p.length < 2 ? p.join("") : `${p.slice(0, -1).join(", ")} and ${p[p.length - 1]}`;
}

/** For the end of a sentence: "a TWOPRINT buyback, a KNTQ buyback and team/ops, a third each" */
export function splitPhrase(mask: number): string {
  const n = enabledLegs(mask).length;
  return legList(mask) + (n === 3 ? ", a third each" : n === 2 ? ", half each" : "");
}

/** What each leg does with its share, for a sentence: "fees buy back TWOPRINT", "fees go to the team". */
const LEG_ACTIONS = ["buy back TWOPRINT", "buy back KNTQ", "go to the team"] as const;

/** A sentence of its own: "A third of fees buy back TWOPRINT, a third buy back KNTQ and a third go to the team" */
export function splitSentence(mask: number): string {
  const legs = enabledLegs(mask);
  if (legs.length === 0) return "";
  if (legs.length === 1) return `All fees ${LEG_ACTIONS[legs[0]]}`;
  const share = legs.length === 3 ? "a third" : "half";
  const parts = legs.map((i, k) => `${k === 0 ? `${share[0].toUpperCase()}${share.slice(1)} of fees` : share} ${LEG_ACTIONS[i]}`);
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** For a table cell or a row label: "TWOPRINT buyback", "KNTQ buyback", "Team/ops" */
export function legLabel(leg: number): string {
  const n: string = LEG_NAMES[leg] ?? `leg ${leg}`;
  return n[0].toUpperCase() + n.slice(1);
}
