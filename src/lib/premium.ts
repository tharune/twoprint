// The two-print premium for the landing page's illustrations (contracts/src/lib/RiskMath.sol, script/Config.sol).
// Premium = mult x max(sigma-hat, floor) x notional. The live ticket quotes from the chain (PositionLens.quoteOpen).

/** Config.sol's S4 parameters (M3, 2026-10-19): 2.9 x max(sigma-hat, 4 bp). Used until the chain answers. */
export const DEFAULT_PREMIUM_MULT_E4 = 29_000;
export const DEFAULT_SIGMA_FLOOR_E8 = 40_000;
/** Typical BTC volatility per ~3 s print. The 4 bp floor binds above it, so in normal conditions the premium is flat. */
export const TYPICAL_SIGMA_E8 = 15_000;

/** The made-up order every landing illustration shares: a BTC long entered at this price with this much tUSDC posted. */
export const EXAMPLE_ENTRY = 108_000;
export const EXAMPLE_COLLATERAL = 20;

/** The premium as a fraction of notional. */
export function premiumRate(multE4: number, floorE8: number, sigmaE8 = TYPICAL_SIGMA_E8): number {
  return (multE4 / 1e4) * (Math.max(sigmaE8, floorE8) / 1e8);
}

/** An example position: premium, margin left after it, and the level's distance from entry as a fraction. */
export function examplePosition(collateral: number, leverage: number, rate: number) {
  const notional = collateral * leverage;
  const premium = notional * rate;
  const margin = collateral - premium;
  return { notional, premium, margin, distance: margin / notional };
}

/** The premium parameters to illustrate with: the chain's once it answers, else Config's. */
export function premiumParams(pm?: { premiumMultE4: number; sigmaFloorE8: number } | null) {
  return { multE4: pm?.premiumMultE4 ?? DEFAULT_PREMIUM_MULT_E4, floorE8: pm?.sigmaFloorE8 ?? DEFAULT_SIGMA_FLOOR_E8 };
}
