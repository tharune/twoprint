import { useMemo, useRef, useState, type PointerEvent } from "react";
import { useApp } from "../app-context";
import { useNow } from "../hooks/data";
import { useWidth } from "../hooks/useWidth";
import { useBook } from "../lib/book";
import { DEPTH_MARGIN as M, depthAt, depthGeometry, oracleMarker } from "../lib/depth";
import { feedView } from "../lib/feed";
import { stepDecimals, tickLabel } from "../lib/ticks";

/** Cumulative size at the venue's returned price levels, with an independent oracle reference. */
function Depth({ coin, dp, oracle, oracleStale, now }: { coin: string; dp: number; oracle?: number; oracleStale: boolean; now: number }) {
  const box = useRef<HTMLDivElement>(null);
  const width = useWidth(box, { initial: 640, min: 240 });
  const height = Math.round(Math.max(280, Math.min(460, width * 0.52)));
  const q = useBook(coin);
  const [pointerX, setPointerX] = useState<number | null>(null);
  const g = useMemo(() => q.data ? depthGeometry(q.data, width, height) : null, [q.data, width, height]);

  if (!g) {
    return (
      <div ref={box} className="depthchart">
        <div className="depth depth--empty" style={{ height }}>
          {q.isError || q.isSuccess ? "The order book is not available right now" : <span className="sk sk--plot" role="status" aria-label="Loading the order book" />}
        </div>
      </div>
    );
  }

  const at = (e: PointerEvent<HTMLDivElement>) => {
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
    setPointerX(px);
  };
  const hover = pointerX !== null && pointerX >= M.left && pointerX <= M.left + g.w ? g.lo - g.pad + ((pointerX - M.left) / g.w) * (g.hi - g.lo + g.pad * 2) : null;
  const reading = hover === null ? null : depthAt(g, hover);
  const marker = oracle === undefined ? null : oracleMarker(g, oracle);
  const xd = stepDecimals(g.xs.step);
  const yd = stepDecimals(g.ys.step);
  const unit = coin.split(":").pop();
  return (
    <div ref={box} className="depthchart">
      <dl className="depthchart__quotes">
        <div className="depthchart__bid"><dt>Best bid</dt><dd>{tickLabel(g.bestBid, dp)}</dd></div>
        <div><dt>Spread</dt><dd>{tickLabel(g.bestAsk - g.bestBid, dp)}</dd></div>
        <div className="depthchart__ask"><dt>Best ask</dt><dd>{tickLabel(g.bestAsk, dp)}</dd></div>
      </dl>
      {(q.isError || (q.data && now - q.data.time > 10_000)) && <p className="depthchart__status" role="status">Book snapshot is stale</p>}
      <div className="depthchart__references">
        <span>Book mid <b>{tickLabel(g.mid, dp)}</b></span>
        {marker && oracle !== undefined && (
          <span className="depthchart__oracle">
            Oracle <b>{tickLabel(oracle, dp)}</b>{oracleStale && " · stale"}
            {marker.position !== "inside" && <small>{marker.position === "above" ? "Above displayed book →" : "← Below displayed book"}</small>}
          </span>
        )}
      </div>
      <div className="depth" style={{ height }} onPointerMove={at} onPointerLeave={() => setPointerX(null)}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${coin} order book depth: best bid ${tickLabel(g.bestBid, dp)}, best ask ${tickLabel(g.bestAsk, dp)}`}>
          <defs>
            <linearGradient id="depth-bid" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--long)" stopOpacity="0.38" />
              <stop offset="1" stopColor="var(--long)" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="depth-ask" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--short)" stopOpacity="0.38" />
              <stop offset="1" stopColor="var(--short)" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <text className="depth__tick" x={M.left} y={11}>Cumulative {unit}</text>
          {g.ys.ticks.map((t) => (
            <g key={t}>
              <line className="depth__grid" x1={M.left} x2={width - M.right} y1={g.y(t)} y2={g.y(t)} />
              <text className="depth__tick" x={M.left - 8} y={g.y(t) + 4} textAnchor="end">{tickLabel(t, yd)}</text>
            </g>
          ))}
          {g.xs.ticks.map((t) => (
            <text key={t} className="depth__tick" x={g.x(t)} y={height - 8} textAnchor="middle">{tickLabel(t, xd)}</text>
          ))}
          <path d={g.bidArea} fill="url(#depth-bid)" />
          <path d={g.askArea} fill="url(#depth-ask)" />
          <path className="depth__line depth__line--bid" d={g.bidLine} />
          <path className="depth__line depth__line--ask" d={g.askLine} />
          <line className="depth__mid" x1={g.x(g.mid)} x2={g.x(g.mid)} y1={M.top} y2={height - M.bottom} />
          {marker?.position === "inside" && <line className="depth__oracle" x1={marker.x} x2={marker.x} y1={M.top} y2={height - M.bottom} />}
          {hover !== null && <line className="depth__cursor" x1={g.x(hover)} x2={g.x(hover)} y1={M.top} y2={height - M.bottom} />}
        </svg>
        {hover !== null && reading && (
          <div className="lw__tip" style={{ left: Math.min(Math.max(g.x(hover), 92), width - 92), top: M.top }}>
            <b>{tickLabel(hover, dp)}</b>
            <span>{reading.side === "bid" ? "Wanted down to here" : "For sale up to here"}: {reading.total.toLocaleString("en-US", { maximumFractionDigits: 3 })} {unit}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** The depth tab shows the selected market's book without expanding its scale to a distant oracle. */
export function DepthChart() {
  const { selected, market, marketLive, snap } = useApp();
  const now = useNow(1_000);
  const latest = marketLive ? snap?.markets[market]?.latest?.oraclePx : undefined;
  return <Depth key={selected.source} coin={selected.source} dp={selected.dp} oracle={latest !== undefined ? Number(latest) / 1e8 : undefined} oracleStale={feedView(snap, now).state !== "live"} now={now} />;
}
