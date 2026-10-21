import { cumulative, type Book } from "./book";
import { niceTicks } from "./ticks";

export const DEPTH_MARGIN = { top: 16, right: 20, bottom: 30, left: 52 };

/** Geometry for the returned book only; an oracle annotation must not stretch its price axis. */
export function depthGeometry(book: Book | undefined, width: number, height: number) {
  if (!book || book.bids.length === 0 || book.asks.length === 0) return null;
  if ([...book.bids, ...book.asks].some(({ px, sz }) => !Number.isFinite(px) || px <= 0 || !Number.isFinite(sz) || sz < 0)) return null;
  const bids = cumulative(book.bids);
  const asks = cumulative(book.asks);
  const mid = book.bids[0].px / 2 + book.asks[0].px / 2;
  const lo = bids[bids.length - 1].px;
  const hi = asks[asks.length - 1].px;
  const span = hi - lo;
  if (span < 0) return null;
  const pad = span > 0 ? span * 0.04 : Math.max(mid * 0.000001, 0.00000001);
  const maximum = Math.max(bids[bids.length - 1].total, asks[asks.length - 1].total);
  const top = maximum > 0 ? maximum * 1.08 : 1;
  if (!Number.isFinite(top)) return null;
  const w = Math.max(1, Number.isFinite(width) ? width - DEPTH_MARGIN.left - DEPTH_MARGIN.right : 1);
  const h = Math.max(1, Number.isFinite(height) ? height - DEPTH_MARGIN.top - DEPTH_MARGIN.bottom : 1);
  const x = (px: number) => DEPTH_MARGIN.left + ((px - (lo - pad)) / (hi - lo + pad * 2)) * w;
  const y = (t: number) => DEPTH_MARGIN.top + (1 - t / top) * h;
  const path = (side: { px: number; total: number }[]) => {
    let d = `M${x(side[0].px).toFixed(1)} ${y(0).toFixed(1)}V${y(side[0].total).toFixed(1)}`;
    for (let i = 1; i < side.length; i++) {
      d += `H${x(side[i].px).toFixed(1)}V${y(side[i].total).toFixed(1)}`;
    }
    return d;
  };
  const bidLine = path(bids);
  const askLine = path(asks);
  const bidArea = `${bidLine}V${y(0).toFixed(1)}Z`;
  const askArea = `${askLine}V${y(0).toFixed(1)}Z`;
  return { bids, asks, mid, x, y, w, h, lo, hi, pad, top, bidLine, askLine, bidArea, askArea, xs: niceTicks(lo - pad, hi + pad, Math.max(2, Math.floor(w / 100))), ys: niceTicks(0, top, 4), bestBid: book.bids[0].px, bestAsk: book.asks[0].px };
}

export type DepthGeometry = NonNullable<ReturnType<typeof depthGeometry>>;

export function depthAt(g: DepthGeometry, price: number): { side: "bid" | "ask"; total: number } {
  return price <= g.mid ? { side: "bid", total: g.bids.filter((b) => b.px >= price).at(-1)?.total ?? 0 } : { side: "ask", total: g.asks.filter((a) => a.px <= price).at(-1)?.total ?? 0 };
}

export function oracleMarker(g: DepthGeometry, oracle: number): { x: number; position: "inside" | "below" | "above" } {
  if (oracle < g.lo) return { x: DEPTH_MARGIN.left, position: "below" };
  if (oracle > g.hi) return { x: DEPTH_MARGIN.left + g.w, position: "above" };
  return { x: g.x(oracle), position: "inside" };
}
