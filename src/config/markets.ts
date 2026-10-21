// Every market Twoprint lists, by asset class. A market is live when the deployed contracts have an index for it; the rest are
// listed so the venue's shape is visible, and cannot be traded until the engine carries them (design-cards/multi-asset-vaults.md).
//
// Each class has its own vault. Today the single HouseVault only backs the two crypto markets, so it is the crypto vault.
//
// The lists are ranked by 24h notional volume on Hyperliquid, which is where the prices come from: the main dex for crypto and
// the HIP-3 dex "xyz" for stocks, indices, forex and commodities. Measured 2026-10-19 from the public info API
// (metaAndAssetCtxs, with names and categories from perpAnnotation and perpCategories). Re-rank before adding a market; a thin
// one makes a poor venue because the oracle is only as good as the market behind it.
//
// Stocks are single stocks and broad indices, ranked together. A leveraged or thematic fund (SOXL, DRAM) and a second listing of
// a company already listed (SKHY, the SK hynix ADS) are left out, though they trade more than some of the names kept.
// xyz:XYZ100 tracks a modified market-cap-weighted index of 100 large Nasdaq names (29,595 against 29,559 for the Nasdaq-100 on
// the same day), so its chart is NASDAQ:NDX. Check each TradingView symbol when its market goes live; SK hynix's is quoted in KRW.

export type AssetClass = "crypto" | "stocks" | "forex" | "commodities";

export interface MarketDef {
  /** Stable id, also used in the URL. */
  id: string;
  /** What the venue shows: "BTC", "EUR/USD". */
  symbol: string;
  name: string;
  class: AssetClass;
  /** The Hyperliquid coin the oracle price comes from: "BTC", or a HIP-3 coin like "xyz:TSLA". */
  source: string;
  /** TradingView symbol for the Advanced chart. */
  tv: string;
  /** Decimals an oracle price is shown with. */
  dp: number;
  /** Index on the deployed contracts, or null while the engine does not carry the market. */
  index: number | null;
  /** 24h notional volume and open interest on Hyperliquid, in USD millions, on 2026-10-19. */
  liq: { vol: number; oi: number };
}

export interface ClassDef {
  id: AssetClass;
  label: string;
  vault: string;
}

export const CLASSES: ClassDef[] = [
  { id: "crypto", label: "Crypto", vault: "Crypto vault" },
  { id: "stocks", label: "Stocks", vault: "Stocks vault" },
  { id: "forex", label: "Forex", vault: "Forex vault" },
  { id: "commodities", label: "Commodities", vault: "Commodities vault" },
];

const m = (
  id: string,
  symbol: string,
  name: string,
  cls: AssetClass,
  source: string,
  tv: string,
  dp: number,
  index: number | null,
  vol: number,
  oi: number,
): MarketDef => ({ id, symbol, name, class: cls, source, tv, dp, index, liq: { vol, oi } });

/** Ranked by volume within each class. */
export const MARKET_DEFS: MarketDef[] = [
  m("BTC", "BTC", "Bitcoin", "crypto", "BTC", "BINANCE:BTCUSDT", 1, 0, 2101.0, 3291.0),
  m("ETH", "ETH", "Ethereum", "crypto", "ETH", "BINANCE:ETHUSDT", 2, 1, 803.8, 2606.8),
  m("ZEC", "ZEC", "Zcash", "crypto", "ZEC", "BINANCE:ZECUSDT", 2, null, 348.6, 542.3),
  m("HYPE", "HYPE", "Hyperliquid", "crypto", "HYPE", "BINANCE:HYPEUSDT", 3, null, 304.4, 1600.8),
  m("SOL", "SOL", "Solana", "crypto", "SOL", "BINANCE:SOLUSDT", 2, null, 195.8, 577.7),

  m("SKHX", "SKHX", "SK hynix", "stocks", "xyz:SKHX", "KRX:000660", 2, null, 442.2, 348.7),
  m("NDX", "NDX", "Nasdaq-100 index", "stocks", "xyz:XYZ100", "NASDAQ:NDX", 1, null, 394.7, 297.6),
  m("SPX", "SPX", "S&P 500 index", "stocks", "xyz:SP500", "SP:SPX", 1, null, 324.9, 378.1),
  m("SNDK", "SNDK", "Sandisk", "stocks", "xyz:SNDK", "NASDAQ:SNDK", 2, null, 229.4, 119.5),
  m("TSLA", "TSLA", "Tesla", "stocks", "xyz:TSLA", "NASDAQ:TSLA", 2, null, 205.4, 67.9),
  m("MU", "MU", "Micron", "stocks", "xyz:MU", "NASDAQ:MU", 2, null, 148.3, 149.7),
  m("SPCX", "SPCX", "SpaceX", "stocks", "xyz:SPCX", "NASDAQ:SPCX", 2, null, 132.2, 125.2),
  m("NVDA", "NVDA", "Nvidia", "stocks", "xyz:NVDA", "NASDAQ:NVDA", 2, null, 115.1, 111.6),

  m("EURUSD", "EUR/USD", "Euro", "forex", "xyz:EUR", "FX:EURUSD", 5, null, 4.2, 26.5),
  m("USDJPY", "USD/JPY", "Japanese yen", "forex", "xyz:JPY", "FX:USDJPY", 3, null, 3.8, 30.8),
  m("GBPUSD", "GBP/USD", "British pound", "forex", "xyz:GBP", "FX:GBPUSD", 5, null, 0.4, 1.0),

  m("WTI", "WTI", "Crude oil", "commodities", "xyz:CL", "TVC:USOIL", 2, null, 263.0, 141.6),
  m("BRENT", "Brent", "Brent crude", "commodities", "xyz:BRENTOIL", "TVC:UKOIL", 2, null, 124.0, 186.8),
  m("XAG", "Silver", "Silver", "commodities", "xyz:SILVER", "TVC:SILVER", 3, null, 47.2, 161.9),
  m("XAU", "Gold", "Gold", "commodities", "xyz:GOLD", "TVC:GOLD", 2, null, 31.7, 269.7),
];

export const marketById = (id: string): MarketDef | undefined => MARKET_DEFS.find((d) => d.id === id);

/** The market at a contract index. */
export const marketAt = (index: number): MarketDef | undefined => MARKET_DEFS.find((d) => d.index === index);

/** Markets the deployment carries, by contract index. */
export const liveMarkets = (count: number): MarketDef[] =>
  MARKET_DEFS.filter((d) => d.index !== null && d.index < count).sort((a, b) => a.index! - b.index!);

/** Markets of one class, in the order they are ranked. */
export const marketsOf = (cls: AssetClass): MarketDef[] => MARKET_DEFS.filter((d) => d.class === cls);

export const classOf = (id: AssetClass): ClassDef => CLASSES.find((c) => c.id === id)!;

/** How many markets the deployed contracts carry: the engine's NUM_MARKETS constant, as of this build. */
export const DEPLOYED_MARKETS = 2;

/** Whether the deployed contracts carry a market, so it can be traded. */
export const isLiveMarket = (d: MarketDef): boolean => d.index !== null && d.index < DEPLOYED_MARKETS;
