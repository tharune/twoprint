import type { AlertTier } from "../lib/alerts";
import { Badge } from "./ui";

const LABEL: Record<AlertTier, string> = { SAFE: "Safe", WARNING: "Warning", DANGER: "Danger", CRITICAL: "Critical", BREACHED: "Crossed" };
const TITLE: Record<AlertTier, string> = {
  SAFE: "More than 15% of the distance to liquidation is left",
  WARNING: "15% or less of the distance to liquidation is left",
  DANGER: "7% or less of the distance to liquidation is left",
  CRITICAL: "3% or less of the distance to liquidation is left",
  BREACHED: "The price is at or beyond your liquidation price",
};

export const riskTone = (t: AlertTier): "long" | "warn" | "short" => (t === "SAFE" ? "long" : t === "WARNING" || t === "DANGER" ? "warn" : "short");

export function RiskBadge({ tier }: { tier: AlertTier }) {
  return (
    <Badge tone={tier === "SAFE" ? "neutral" : riskTone(tier)} title={TITLE[tier]}>
      {LABEL[tier]}
    </Badge>
  );
}

/** How much of the distance to liquidation is left, as a thin bar. */
export function BufferBar({ pct, tier }: { pct: number; tier: AlertTier }) {
  const share = Math.max(0, Math.min(100, pct));
  return (
    <span className="buffer" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share)} aria-label="Distance to liquidation left" title={TITLE[tier]}>
      <span className="buffer__fill" data-tone={riskTone(tier)} style={{ width: `${share}%` }} />
    </span>
  );
}
