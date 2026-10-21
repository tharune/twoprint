import type { PositionRecord } from "../hooks/data";

export type MarkTone = "commit" | "step" | "fill" | "breach";

export interface Mark {
  label: string;
  tone: MarkTone;
  /** Drawn as an outline: what would happen, not what did. */
  ghost?: boolean;
}

/** Where a position's events sit on its market's print log, keyed by print index. */
export function marksFor(p: PositionRecord | undefined, market: number): Map<number, Mark[]> {
  const out = new Map<number, Mark[]>();
  if (!p || p.market !== market) return out;
  const add = (idx: number, mark: Mark) => out.set(idx, [...(out.get(idx) ?? []), mark]);

  add(p.idxCommit, { label: "Order", tone: "commit" });
  const fillIdx = p.fill ? p.fill.idxFill : p.idxCommit + p.fence;
  for (let k = 1; p.idxCommit + k < fillIdx; k++) {
    add(p.idxCommit + k, { label: k < p.fence ? `Update ${k}` : "Under 1 s, skipped", tone: "step" });
  }
  add(fillIdx, { label: p.fill ? "Fill" : `Update ${p.fence}`, tone: "fill" });

  if (p.breach) add(p.breach.idx, { label: "Crossed", tone: "breach" });
  if (p.liquidated) {
    if (p.liquidated.idx - 1 !== p.breach?.idx) add(p.liquidated.idx - 1, { label: "Still crossed", tone: "breach" });
    add(p.liquidated.idx, { label: "Liquidated", tone: "breach" });
  }
  if (p.closeCommit) {
    add(p.closeCommit.idxCloseCommit, { label: "Close requested", tone: "commit" });
    add(p.closed ? p.closed.idxCloseFill : p.closeCommit.earliestFill, { label: p.closed ? "Close fill" : "Close fill due", tone: "fill" });
  }
  return out;
}
