import test from "node:test";
import assert from "node:assert/strict";
import { CLASSES, DEPLOYED_MARKETS, MARKET_DEFS, classOf, isLiveMarket, liveMarkets, marketAt, marketById, marketsOf } from "../src/config/markets.js";
import { MARKETS, pxDecimals } from "../src/lib/format.js";

// The venue lists its deepest markets first: a thin market makes a poor venue, because the oracle is only as good as the market
// behind it. These checks keep a new listing from slipping in out of order, or being marked live without a contract index.

test("every market has a unique id and belongs to a known class", () => {
  const ids = MARKET_DEFS.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length);
  const classes = new Set(CLASSES.map((c) => c.id));
  for (const d of MARKET_DEFS) assert.ok(classes.has(d.class), `${d.id} has an unknown class`);
  for (const c of CLASSES) assert.ok(marketsOf(c.id).length > 0, `${c.id} lists no market`);
});

test("inside each class the markets are ranked by 24h volume, deepest first", () => {
  for (const c of CLASSES) {
    const vols = marketsOf(c.id).map((d) => d.liq.vol);
    assert.deepEqual(vols, [...vols].sort((a, b) => b - a), `${c.id} is not in volume order`);
  }
});

test("a market is live only when it has an index the deployed contracts carry, and the indexes are dense from zero", () => {
  const live = MARKET_DEFS.filter(isLiveMarket);
  assert.equal(live.length, DEPLOYED_MARKETS);
  assert.deepEqual(
    live.map((d) => d.index).sort(),
    Array.from({ length: DEPLOYED_MARKETS }, (_, i) => i),
  );
  for (const d of MARKET_DEFS) if (d.index !== null && d.index >= DEPLOYED_MARKETS) assert.fail(`${d.id} has index ${d.index}, past the ${DEPLOYED_MARKETS} markets deployed`);
  assert.deepEqual(
    liveMarkets(DEPLOYED_MARKETS).map((d) => d.id),
    ["BTC", "ETH"],
  );
});

test("the symbols and decimals the rest of the app formats with come from the live markets", () => {
  assert.deepEqual([...MARKETS], ["BTC", "ETH"]);
  assert.equal(pxDecimals(0), marketAt(0).dp);
  assert.equal(pxDecimals(1), marketAt(1).dp);
  assert.equal(marketById("ETH").index, 1);
  assert.equal(marketAt(2), undefined);
});

test("a class has a vault named for it, and every price comes from a Hyperliquid coin", () => {
  for (const c of CLASSES) assert.match(classOf(c.id).vault, new RegExp(`^${c.label} vault$`));
  for (const d of MARKET_DEFS) {
    assert.ok(d.source.length > 0 && d.tv.includes(":"), `${d.id} needs a Hyperliquid coin and a TradingView symbol`);
    // the main dex has bare names; a HIP-3 dex prefixes its coins (xyz:TSLA)
    assert.equal(d.source.includes(":"), d.class !== "crypto", `${d.id}: only crypto is on the main dex`);
  }
});
