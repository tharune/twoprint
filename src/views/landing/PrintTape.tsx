import { useLayoutEffect, useMemo, useRef } from "react";
import { useApp } from "../../app-context";
import { MARKETS, diffBp, px } from "../../lib/format";
import { useRecentPrints, type RecentPrint } from "../../lib/recentPrints";
import { canAnimate } from "./motion";

/** The hero opens on BTC with the same 72, so the two share one poll instead of reading the ring twice. */
const KEEP_HERO = 72;
/**
 * ETH needs only what fits on the tape. The public RPC allows a few calls a second, and a cold read of 72 more prints on top of the
 * hero's is enough to trip it.
 */
const KEEP_OTHER = 16;
const SHOWN = 28;

interface Tick {
  key: string;
  market: number;
  print: RecentPrint;
  /** Against the market's print before it, in bp; null for the first one held. */
  move: number | null;
}

/**
 * The oracle's prints for every market as one tape, newest on the right. Each print that lands slides the tape along by one, so
 * the page moves exactly when the feed does and never otherwise. It shows only prints read from the chain: while there are none it
 * holds its height and stays empty.
 */
export function PrintTape() {
  const { deployment, readError, chainId, snap } = useApp();
  const on = !!deployment && !readError;
  const btc = useRecentPrints(chainId, 0, KEEP_HERO, on).data;
  // ETH waits until the first screen has its own reads back, so the tape never slows the hero down.
  const eth = useRecentPrints(chainId, 1, KEEP_OTHER, on && !!snap && !!btc).data;

  const ticks = useMemo(() => {
    const all: Tick[] = [];
    [btc, eth].forEach((list, market) =>
      list?.forEach((p, i) => all.push({ key: `${market}:${p.idx}`, market, print: p, move: i > 0 ? diffBp(p.oraclePx, list[i - 1].oraclePx) : null })),
    );
    return all.sort((a, b) => a.print.time - b.print.time || a.market - b.market).slice(-SHOWN);
  }, [btc, eth]);

  // Slide by however many prints arrived since the last render: start the row that far to the right, then let it ease home.
  const row = useRef<HTMLOListElement>(null);
  const last = useRef<string | null>(null);
  useLayoutEffect(() => {
    const el = row.current;
    const newest = ticks.at(-1)?.key ?? null;
    const before = last.current;
    last.current = newest;
    if (!el || !before || newest === before || !canAnimate()) return;
    const from = ticks.findIndex((t) => t.key === before);
    const added = from < 0 ? 0 : ticks.length - 1 - from;
    const w = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
    if (!added || !w) return;
    el.style.transition = "none";
    el.style.transform = `translateX(${added * w}px)`;
    void el.offsetWidth;
    el.style.transition = "";
    el.style.transform = "";
  }, [ticks]);

  return (
    <div className="tape" aria-hidden="true">
      <ol className="tape__row" ref={row}>
        {ticks.map((t, i) => {
          // A move that rounds to 0.0 bp is flat, not up or down.
          const dir = t.move === null || Math.abs(t.move) < 0.05 ? null : t.move > 0 ? "up" : "down";
          return (
            <li key={t.key} className="tape__tick" data-new={i === ticks.length - 1 || undefined}>
              <b>{MARKETS[t.market]}</b>
              <span className="tape__px">{px(t.print.oraclePx, t.market)}</span>
              <span className="tape__mv" data-dir={dir ?? undefined}>
                {t.move === null ? "" : `${dir === "up" ? "▲" : dir === "down" ? "▼" : "·"} ${Math.abs(t.move).toFixed(1)} bp`}
              </span>
              <span className="tape__idx">#{t.print.idx.toLocaleString("en-US")}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
