// Client-side display comparison of the same trade on two venues.
// Plain numbers (USD, fractions), DISPLAY ONLY. The Twoprint side mirrors PositionManager's close math and reads the live
// Config through the snapshot; the Papertrade side is its docs formula at launch values (INFERENCE: contracts unverified).
// Display examples are covered by test/compare.test.mjs.
import { DEFAULT_PREMIUM_MULT_E4, DEFAULT_SIGMA_FLOOR_E8, TYPICAL_SIGMA_E8 } from "./premium.ts";

/** Papertrade's parameters: documented launch values and a historical read of `0xdc8a47ef` at block 48,934,907. */
export const PAPERTRADE = {
  asOfBlock: 48_934_907,
  baseRate: 0.1,
  rateMultiplier: 15_000,
  referenceNotional: 100_000,
  positionMultiplier: [814.598, 483.979] as const,
  /** the deadband: a winning exit is measured as if it were entryPrice / 50,000 (0.2 bp) worse */
  deadbandDivisor: 50_000,
  winFee: 0.02,
  /** the hard bust sits about 5 bp of price before zero equity (docs); the whole margin is forfeited */
  bustBuffer: 0.0005,
  /** 2% of margin, carved from the forfeited margin, not added to the loss */
  liquidationFee: 0.02,
  maxLeverage: 1000,
  maxNotional: 10_000_000,
  /** Display inference from launch documentation: min margin $10, min position value $1,000 */
  minMargin: 10,
  minNotional: 1_000,
} as const;

/** M1's measured worse-of cost per round trip, bp of notional (G2 recording, 20k random commits). A LOWER BOUND. */
export const M1_ROUND_TRIP_BP = [0.443, 0.589] as const;

/** Twoprint's Config.sol values, used until the chain answers. */
export const TWOPRINT_CONFIG = {
  winFeeBps: 200,
  carryPerHourE8: 2_500,
  premiumMultE4: DEFAULT_PREMIUM_MULT_E4,
  sigmaFloorE8: DEFAULT_SIGMA_FLOOR_E8,
  sigmaE8: TYPICAL_SIGMA_E8,
  maxFillAdjE8: 150_000,
  maxLeverage: 100,
  maxNotionalUsd: 250_000, // Config.sol maxPositionNotional 250_000e6
};

export interface TwoprintParams {
  winFeeBps: number;
  carryPerHourE8: number;
  premiumMultE4: number;
  sigmaFloorE8: number;
  /** σ̂ per print at commit (PriceRing.sigmaE8) */
  sigmaE8: number;
  maxFillAdjE8: number;
  maxLeverage: number;
  /** PositionManager maxPositionNotional, USD (above it commitOpen reverts NotionalTooLarge) */
  maxNotionalUsd: number;
}

export interface TradeInput {
  market: 0 | 1;
  isLong: boolean;
  leverage: number;
  /** what you post, USD (on both venues this is the margin the % figures divide by) */
  collateral: number;
  /** signed price move in percent: +0.1 means the price rose 0.1% */
  movePct: number;
  holdHours: number;
  /** entry price, USD (only the liquidation price depends on it) */
  entryPx: number;
}

export interface FeeLine {
  label: string;
  /** USD taken from the trader (0 for a line that only explains) */
  amount: number;
  note: string;
}

export interface VenueResult {
  available: boolean;
  /** why the trade is not possible on this venue */
  unavailable?: string;
  notional: number;
  /** payout minus what you posted, USD */
  kept: number;
  /** kept as % of margin */
  keptPct: number;
  /** raw PnL on the price move before anything is taken, USD */
  raw: number;
  liquidated: boolean;
  /** liquidation price and its distance from entry as a fraction of price */
  liqPx: number;
  liqDistance: number;
  fees: FeeLine[];
  warnings: string[];
}

const favourable = (t: TradeInput) => (t.isLong ? t.movePct > 0 : t.movePct < 0);

/** Papertrade's keep factor on the gain after the deadband (docs `#/how/asymmetric-impact`). `move` is a fraction after the deadband. */
export function papertradeScale(move: number, market: 0 | 1): number {
  if (move <= 0) return 0;
  const P = PAPERTRADE;
  const term1 = 1 / (move * P.rateMultiplier);
  const term2 = P.referenceNotional / (1e6 * move * P.positionMultiplier[market]);
  return Math.min(1 - P.baseRate, (1 - P.baseRate) / (1 + term1 + term2));
}

export function papertrade(t: TradeInput): VenueResult {
  const P = PAPERTRADE;
  const notional = t.collateral * t.leverage;
  const m = Math.abs(t.movePct) / 100;
  const raw = notional * m * (favourable(t) ? 1 : -1);
  const liqDistance = 1 / t.leverage - P.bustBuffer;
  const liqPx = t.isLong ? t.entryPx * (1 - liqDistance) : t.entryPx * (1 + liqDistance);
  const warnings: string[] = [];
  if (t.collateral < P.minMargin) warnings.push(`Below Papertrade's $${P.minMargin} minimum margin (INFERENCE).`);
  if (notional < P.minNotional) warnings.push(`Below Papertrade's $${P.minNotional.toLocaleString("en-US")} minimum position value (INFERENCE).`);
  if (notional > P.maxNotional) warnings.push("Above Papertrade's $10M maximum position.");
  const base = { notional, raw, liqPx, liqDistance, warnings };

  if (t.leverage > P.maxLeverage || liqDistance <= 0) {
    return { ...base, available: false, unavailable: `Papertrade allows 1–${P.maxLeverage}x.`, kept: 0, keptPct: 0, liquidated: false, fees: [] };
  }

  if (favourable(t)) {
    const db = 1 / P.deadbandDivisor;
    const after = Math.max(0, m - db);
    const scale = papertradeScale(after, t.market);
    const gainAfterDeadband = notional * after;
    const adj = gainAfterDeadband * scale;
    const fee = adj * P.winFee;
    const kept = adj - fee;
    return {
      ...base,
      available: true,
      kept,
      keptPct: (kept / t.collateral) * 100,
      liquidated: false,
      fees: [
        { label: "Deadband (0.2 bp)", amount: raw - gainAfterDeadband, note: "The exit is measured as if it were entry / 50,000 worse. A win smaller than that pays 0." },
        { label: "Impact haircut", amount: gainAfterDeadband - adj, note: `You keep ${(scale * 100).toFixed(1)}% of the gain after the deadband (capped at 90%).` },
        { label: "Win fee (2%)", amount: fee, note: "2% of the gain after the haircut, split between stakers and the developer." },
        { label: "Liquidation fee", amount: 0, note: "Only on a bust: 2% of margin, carved from the forfeited margin." },
      ],
    };
  }

  if (m >= liqDistance) {
    return {
      ...base,
      available: true,
      kept: -t.collateral,
      keptPct: -100,
      liquidated: true,
      fees: [
        { label: "Bust", amount: t.collateral, note: "The mid crossed the bust price, about 5 bp of price before zero equity. The whole margin is forfeited." },
        { label: "Liquidation fee (2% of margin)", amount: 0, note: `${money(t.collateral * P.liquidationFee)} of it, carved from the forfeited margin, not added to your loss.` },
      ],
    };
  }
  return {
    ...base,
    available: true,
    kept: raw,
    keptPct: (raw / t.collateral) * 100,
    liquidated: false,
    fees: [
      { label: "Loss fee (2%)", amount: 0, note: "2% of the loss, taken from the LP's gain, not from you." },
      { label: "Liquidation fee", amount: 0, note: "Only on a bust: 2% of margin, carved from the forfeited margin." },
    ],
  };
}

/** The live Config through the snapshot's `pm` and σ̂, with Config.sol fallbacks. */
export function twoprintParams(pm?: Partial<Omit<TwoprintParams, "maxNotionalUsd">> & { maxLevDefault?: number; maxLevVerified?: number; maxPositionNotional?: bigint | number } | null, sigmaE8?: number | bigint | null): TwoprintParams {
  const c = TWOPRINT_CONFIG;
  const lev = pm ? Math.max(pm.maxLevDefault ?? 0, pm.maxLevVerified ?? 0) : 0;
  const maxNotional = pm?.maxPositionNotional !== undefined ? Number(pm.maxPositionNotional) / 1e6 : 0; // tUSDC, 6 decimals
  return {
    winFeeBps: pm?.winFeeBps ?? c.winFeeBps,
    carryPerHourE8: pm?.carryPerHourE8 ?? c.carryPerHourE8,
    premiumMultE4: pm?.premiumMultE4 ?? c.premiumMultE4,
    sigmaFloorE8: pm?.sigmaFloorE8 ?? c.sigmaFloorE8,
    sigmaE8: sigmaE8 !== undefined && sigmaE8 !== null && Number(sigmaE8) > 0 ? Number(sigmaE8) : c.sigmaE8,
    maxFillAdjE8: pm?.maxFillAdjE8 ?? c.maxFillAdjE8,
    maxLeverage: lev > 0 ? lev : c.maxLeverage,
    maxNotionalUsd: maxNotional > 0 ? maxNotional : c.maxNotionalUsd,
  };
}

export function twoprint(t: TradeInput, p: TwoprintParams, roundTripBp: number = M1_ROUND_TRIP_BP[t.market]): VenueResult {
  const notional = t.collateral * t.leverage;
  const m = Math.abs(t.movePct) / 100;
  const raw = notional * m * (favourable(t) ? 1 : -1);
  const premiumRate = (p.premiumMultE4 / 1e4) * (Math.max(p.sigmaE8, p.sigmaFloorE8) / 1e8);
  const premium = notional * premiumRate;
  const liqDistance = 1 / t.leverage - premiumRate; // bankruptcy price on (collateral − premium)
  const liqPx = t.isLong ? t.entryPx * (1 - liqDistance) : t.entryPx * (1 + liqDistance);
  const base = { notional, raw, liqPx, liqDistance, warnings: [] as string[] };
  const no = (why: string): VenueResult => ({ ...base, available: false, unavailable: why, kept: 0, keptPct: 0, liquidated: false, fees: [] });

  if (t.leverage > p.maxLeverage) return no(`Twoprint's live cap (verified tier) is ${p.maxLeverage}x.`);
  if (notional > p.maxNotionalUsd) return no(`Above Twoprint's live max position notional (${money(p.maxNotionalUsd)}).`);
  // PositionManager's MarginTooThin: (collateral − premium) must exceed notional × maxFillAdj × 2.
  if (liqDistance <= (2 * p.maxFillAdjE8) / 1e8) return no("The premium leaves too little margin at this σ̂ (the contract reverts MarginTooThin).");

  const premiumLine = (consumed: boolean): FeeLine => ({
    label: `Reserved premium (${(premiumRate * 1e4).toFixed(1)} bp of notional)`,
    amount: 0,
    note: consumed
      ? `${money(premium)}, part of what you posted, goes to the vault with the rest.`
      : `${money(premium)} reserved at open and refunded at close, because no print crossed your level.`,
  });

  if (!favourable(t) && m >= liqDistance) {
    return {
      ...base,
      available: true,
      kept: -t.collateral,
      keptPct: -100,
      liquidated: true,
      fees: [
        { label: "Liquidated", amount: t.collateral, note: "Two consecutive oracle prints at or beyond your level. You lose what you posted and nothing more." },
        premiumLine(true),
        { label: "Liquidation fee", amount: 0, note: "None." },
      ],
    };
  }

  const toll = (notional * roundTripBp) / 1e4;
  const pnl = raw - toll;
  // PositionManager._closeMath: equity = margin (collateral − premium) + pnl, floored at 0; carry, then the win fee, each
  // only from what is left; the unconsumed premium is released on top. Kept = payout − collateral.
  const equityPos = Math.max(0, t.collateral - premium + pnl);
  const carryDue = ((notional * p.carryPerHourE8) / 1e8) * Math.max(0, t.holdHours);
  const carry = Math.min(carryDue, equityPos);
  const rem = equityPos - carry;
  const winFee = pnl > 0 ? Math.min((pnl * p.winFeeBps) / 1e4, rem) : 0;
  const kept = rem - winFee + premium - t.collateral;
  return {
    ...base,
    available: true,
    kept,
    keptPct: (kept / t.collateral) * 100,
    liquidated: false,
    fees: [
      { label: `Worse-of fill cost (${roundTripBp.toFixed(2)} bp round trip)`, amount: toll, note: "Measured, lower bound (M1: mean of 20k random commits on the G2 recording; one live hour ran 4–6% higher). It goes to the vault, not the FeeRouter." },
      { label: `Win fee (${(p.winFeeBps / 100).toFixed(p.winFeeBps % 100 ? 2 : 0)}%)`, amount: winFee, note: winFee > 0 ? "Of your positive PnL after the fill cost." : "Only on positive PnL." },
      { label: `Carry (${(p.carryPerHourE8 / 1e4).toFixed(2)} bp/h × ${fmtHours(t.holdHours)})`, amount: carry, note: "Of notional, paid only from positive equity." },
      premiumLine(false),
      { label: "Liquidation fee", amount: 0, note: "None." },
    ],
  };
}

export function compare(t: TradeInput, p: TwoprintParams, roundTripBp?: number) {
  return { papertrade: papertrade(t), twoprint: twoprint(t, p, roundTripBp) };
}

function fmtHours(h: number) {
  return `${Number(h.toFixed(2))} h`;
}
export function money(v: number, dp = 2) {
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return `${v < 0 ? "−" : ""}$${s}`;
}

// ---------------------------------------------------------------- S2: the push tape (SYNTHETIC)

/** One step of the synthetic Oct-10-shaped push: offsets in bp from the pre-push oracle price. */
export interface PushStep {
  t: number;
  oracle: number;
  mid: number;
  basisEwma: number;
  adjMid: number;
  /** a Twoprint buy and sell filled at this step (RiskMath.worseOfFill, ±15 bp clamp) */
  buyFill: number;
  sellFill: number;
  /** a Papertrade-style fill: the (pushed) mid, either side */
  midFill: number;
}

export const PUSH = { bp: 12, rampSec: 5, holdUntilSec: 60, clampBp: 15, ewmaDragBp: 0.6 } as const;

/** The mid's push at time t (s from T0): +12 bp ramped over 5 s, held to T0 + 60 s, released over 5 s (M2 §2.1). */
export function pushAt(t: number): number {
  const { bp, rampSec, holdUntilSec } = PUSH;
  if (t <= 0 || t >= holdUntilSec + rampSec) return 0;
  if (t < rampSec) return (bp * t) / rampSec;
  if (t <= holdUntilSec) return bp;
  return bp * (1 - (t - holdUntilSec) / rampSec);
}

/** The trailing basis EWMA drag: ~0.6 bp by the end of a 60 s push (M2 §2.3, BTC), decaying slowly after. */
function ewmaAt(t: number): number {
  const { holdUntilSec, ewmaDragBp } = PUSH;
  if (t <= 0) return 0;
  if (t <= holdUntilSec) return (ewmaDragBp * t) / holdUntilSec;
  return ewmaDragBp * Math.exp(-(t - holdUntilSec) / 600);
}

export function worseOfBp(oracle: number, adjMid: number, isBuy: boolean, clampBp: number = PUSH.clampBp): number {
  if (isBuy) return adjMid <= oracle ? oracle : oracle + Math.min(adjMid - oracle, clampBp);
  return adjMid >= oracle ? oracle : oracle - Math.min(oracle - adjMid, clampBp);
}

export function pushTape(times: number[], push: (t: number) => number = pushAt): PushStep[] {
  return times.map((t) => {
    const oracle = 0; // φ = 0: oraclePx holds
    const mid = push(t);
    const basisEwma = ewmaAt(t);
    const adjMid = mid - basisEwma;
    return { t, oracle, mid, basisEwma, adjMid, buyFill: worseOfBp(oracle, adjMid, true), sellFill: worseOfBp(oracle, adjMid, false), midFill: mid };
  });
}
