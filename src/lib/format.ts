import { DEPLOYED_MARKETS, liveMarkets } from "../config/markets.ts";

// Units (keep these right): prices 1e8 USD; tUSDC 6 decimals; basis / sigma / adjustments in 1e-8 (÷1e4 for bp).
export const E8 = 100_000_000n;
const E6 = 1_000_000n;

const LIVE = liveMarkets(DEPLOYED_MARKETS);
/** The deployed markets' symbols, by contract index. */
export const MARKETS: readonly string[] = LIVE.map((d) => d.symbol);
const PX_DP: Record<number, number> = Object.fromEntries(LIVE.map((d) => [d.index!, d.dp])); // HL oraclePx precision, per market

/** Decimal places of a market's oracle price: how finely an axis label may be cut. */
export const pxDecimals = (market: number) => PX_DP[market] ?? 2;

const group = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Exact bigint fixed-point to a grouped decimal string, rounded half away from zero to `dp` places (all of them when `dp` is `decimals`). */
export function fixed(v: bigint, decimals: number, dp: number): string {
  let a = v < 0n ? -v : v;
  if (dp < decimals) {
    const step = 10n ** BigInt(decimals - dp);
    a = ((a + step / 2n) / step) * step;
  }
  const neg = v < 0n && a !== 0n; // a small loss that rounds to nothing is not "−0.00"
  const base = 10n ** BigInt(decimals);
  const whole = a / base;
  let frac = (a % base).toString().padStart(decimals, "0").slice(0, dp);
  if (dp === 0) frac = "";
  return `${neg ? "−" : ""}${group(whole.toString())}${frac ? "." + frac : ""}`;
}

/** 1e8 price -> "82,151.3" with market precision (more dp on request). */
export const px = (v: bigint | number | undefined, market = 0, extraDp = 0) =>
  v === undefined ? "–" : fixed(BigInt(v), 8, (PX_DP[market] ?? 2) + extraDp);

/** tUSDC (6 dp) -> "20.00" (dp default 2). */
export const usdc = (v: bigint | number | undefined, dp = 2) => (v === undefined ? "–" : fixed(BigInt(v), 6, dp));

/** tUSDC to the cent, or to 6 places while it is under a cent, so a first fee of a few hundred raw units does not read as 0.00. */
export const usdcFine = (v: bigint | number | undefined) => {
  if (v === undefined) return "–";
  const n = BigInt(v);
  return usdc(n, (n < 0n ? -n : n) > 0n && (n < 0n ? -n : n) < 10_000n ? 6 : 2);
};

/** A number of tUSDC (not base units) with a sign when asked for: "+8.15", "−3.20", "0.00". */
/** A figure with the zeros at the end of its decimals dropped, for the ticks on an axis: 12.00 reads as 12 and 0.0800 as 0.08. */
export const trimmed = (s: string): string => (s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s);

export function money(v: number, dp = 2, signed = false): string {
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const zero = Number(s.replace(/,/g, "")) === 0;
  return `${zero ? "" : v < 0 ? "−" : signed ? "+" : ""}${s}`;
}

/** Signed tUSDC: "+8.15" / "−3.20". */
export const usdcSigned = (v: bigint | undefined, dp = 2) =>
  v === undefined ? "–" : v > 0n ? `+${fixed(v, 6, dp)}` : fixed(v, 6, dp);

/** A 1e-8 relative quantity (basis EWMA, sigma) to bp: ÷1e4. */
export const e8ToBp = (v: bigint | number) => Number(v) / 1e4;

/** Relative difference in bp between two 1e8 prices: (a - b) / b × 1e4. */
export const diffBp = (a: bigint, b: bigint) => (b === 0n ? 0 : Number(((a - b) * 10_000_000_000n) / b) / 1e6);

/** A move in bp as a percentage, the way most people read it: 5 bp is +0.05%. */
export const movePct = (x: number, dp = 2) => {
  const shown = Math.abs(x / 100).toFixed(dp);
  return `${Number(shown) === 0 ? "" : x > 0 ? "+" : "−"}${shown}%`;
};

export const bp = (x: number, dp = 2) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toFixed(dp)} bp`;
export const pct = (x: number, dp = 2) => `${x.toFixed(dp)}%`;

/** A dollar figure for a list: 2_242_200_000 is "$2.2B", 448_700_000 is "$449M", 4_300_000 is "$4.3M". */
export function compactUsd(v: number | undefined): string {
  if (v === undefined || !Number.isFinite(v)) return "–";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e8) return `$${Math.round(v / 1e6)}M`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
}

export const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "–");

export function ago(ms: number): string {
  if (!Number.isFinite(ms)) return "–";
  const s = Math.max(0, ms) / 1000;
  if (s < 10) return `${s.toFixed(1)} s`;
  if (s < 90) return `${Math.round(s)} s`;
  if (s < 5400) return `${Math.round(s / 60)} min`;
  return `${(s / 3600).toFixed(1)} h`;
}

/** Parse a user-typed tUSDC amount ("20", "20.5") to 6-dp units; null if invalid. */
export function parseUsdc(s: string): bigint | null {
  const m = /^\s*(\d{1,12})(?:\.(\d{0,6}))?\s*$/.exec(s);
  if (!m) return null;
  return BigInt(m[1]) * E6 + BigInt((m[2] ?? "").padEnd(6, "0"));
}
