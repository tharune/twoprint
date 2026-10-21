import { useId, useMemo, useRef, useState } from "react";
import { isLive, stateOf, type PositionRecord, type PrintEv } from "../hooks/data";
import { useWidth } from "../hooks/useWidth";
import { MARKETS, bp, diffBp, pct, pxDecimals, px } from "../lib/format";
import { marksFor, type Mark } from "../lib/marks";
import { levelNow } from "../lib/receipt";
import { niceTicks, stepDecimals, tickLabel } from "../lib/ticks";
import { PRINT_WINDOW } from "../lib/window";
import { Pill, XAxis, YAxis } from "./chart-parts";

const PAD = { right: 74, bottom: 28, left: 6 };
const TAG_H = 14;
const TAG_ROW = TAG_H + 4;
const MIN_TAG_ROWS = 1;
const MAX_TAG_ROWS = 5;
const WINDOW = PRINT_WINDOW;
const MAX_LOOKBACK = 150;
/** An order picked from the lists is drawn over its own span, with this many prints of context either side, and no more than this many in all. */
const ORDER_MARGIN = 8;
const ORDER_MAX_SPAN = 320;
const AXIS_GAP = 64;
/** Vertical room per gridline, so the price axis reads in round steps about this far apart. */
const GRID_GAP = 38;
const STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500];

const E8 = 1e8;
const num = (v: bigint) => Number(v) / E8;
const toPx = (v: number, market: number) => px(BigInt(Math.round(v * E8)), market);

interface Slot {
  idx: number;
  print?: PrintEv;
  ghost: boolean;
  x: number;
}

interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

/** Where a label on a line is drawn: its text anchor point, its baseline and which way the text runs from it. */
interface LabelSpot {
  x: number;
  base: number;
  anchor: "start" | "end";
}
/** A generous width per character of the 11 px line labels, for fitting them without measuring. */
const LABEL_CHAR_W = 6.6;

interface Tag {
  x: number;
  left: number;
  row: number;
  mark: Mark;
  w: number;
}

/** What the order being put together in the ticket would do, drawn before anything is committed. */
export interface ChartPreview {
  isLong: boolean;
  /** The quoted liquidation level, or null while there is no quote. */
  level: bigint | null;
  /** Oracle changes after the commit that the fill waits for. */
  fence: number;
}

/**
 * The oracle price as it actually arrives: a step per print, never a candle, on an axis of print numbers. Your order's
 * commit, its fill and any breach sit on the print they happened at. The prints an order is still waiting for show as
 * dashed slots, and with no order to follow the ticket's draft is previewed the same way. With `history` set, a finished
 * order is drawn over the prints it spanned rather than the latest ones.
 */
export function PrintChart({
  prints,
  market,
  focus,
  lastIdx,
  height = 288,
  preview,
  history,
}: {
  prints: PrintEv[];
  market: number;
  focus?: PositionRecord;
  lastIdx: number;
  height?: number;
  preview?: ChartPreview | null;
  history?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const width = useWidth(box);
  const gradId = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);

  const model = useMemo(() => {
    const own = marksFor(focus, market);
    const state = focus && focus.market === market ? stateOf(focus) : undefined;

    // Window: the latest prints, stretched back to include a recent commit, or the span of a finished order.
    const marked = [...own.keys()];
    let start = Math.max(0, lastIdx - WINDOW + 1);
    let end = Infinity;
    const recent = marked.filter((i) => i >= lastIdx - MAX_LOOKBACK);
    if (recent.length) start = Math.min(start, Math.max(0, Math.min(...recent) - 2));
    if (history && marked.length && prints.length && prints[0].idx <= Math.min(...marked)) {
      end = Math.min(lastIdx, Math.max(...marked) + ORDER_MARGIN);
      start = Math.max(prints[0].idx, Math.min(...marked) - ORDER_MARGIN, end - ORDER_MAX_SPAN + 1);
    }
    const shown = prints.filter((p) => p.idx >= start && p.idx <= end);
    // The snapshot can be a print ahead of the event ledger, so the slots after the last drawn print start from that print.
    const lastShown = shown.at(-1)?.idx ?? lastIdx;

    // Prints the focused position is still waiting for.
    let target = -1;
    if (focus && focus.market === market) {
      if (state === "PendingOpen") target = focus.idxCommit + focus.fence;
      else if (state === "PendingClose" && focus.closeCommit) target = focus.closeCommit.earliestFill;
    }
    // With no order to follow, the draft's own commit and earliest fill are shown in their place.
    const previewing = !!preview && !own.size && shown.length > 0;
    if (previewing) target = lastShown + preview!.fence;
    const ghosts: number[] = [];
    for (let i = lastShown + 1; i <= target; i++) ghosts.push(i);

    const marks = new Map(own);
    if (previewing) {
      marks.set(lastShown, [...(marks.get(lastShown) ?? []), { label: "Order", tone: "commit", ghost: true }]);
      marks.set(target, [...(marks.get(target) ?? []), { label: "Earliest fill", tone: "fill", ghost: true }]);
    }

    // The entry and liquidation lines belong to an order that is live, or whose story is on the chart.
    const tracked = focus && focus.market === market && focus.fill && (isLive(focus) || marked.some((i) => i >= start && i <= end)) ? focus : undefined;
    const entry = tracked && state !== "Liquidated" ? num(tracked.fill!.fillPx) : null;
    const level = tracked ? num(levelNow(tracked)!) : null; // the level in force now (DEL-2)
    const draftLevel = previewing && preview!.level !== null ? num(preview!.level) : null;

    return { marks, shown, ghosts, entry, level, state, previewing, draftLevel, isLong: tracked ? tracked.isLong : preview?.isLong ?? true, atLatest: end >= lastIdx };
  }, [prints, market, focus, lastIdx, preview, history]);

  const { shown, ghosts, marks, entry, level, previewing, draftLevel, isLong, atLatest } = model;
  const innerW = width - PAD.left - PAD.right;

  const slots = useMemo(() => {
    const slotsN = shown.length + ghosts.length;
    const dx = innerW / Math.max(1, slotsN - 1);
    const out: Slot[] = [
      ...shown.map((p, i) => ({ idx: p.idx, print: p, ghost: false, x: PAD.left + i * dx })),
      ...ghosts.map((idx, i) => ({ idx, ghost: true, x: PAD.left + (shown.length + i) * dx })),
    ];
    return out;
  }, [shown, ghosts, innerW]);

  // Marker tags sit above the plot, stacked in as many rows as it takes to keep them apart, and kept inside it.
  const tags = useMemo(() => {
    const out: Tag[] = [];
    const rowEnd: number[] = [];
    for (const s of slots) {
      for (const mark of marks.get(s.idx) ?? []) {
        if (mark.tone === "step") continue;
        const w = mark.label.length * 6.3 + 14;
        const left = Math.min(Math.max(s.x - w / 2, 2), width - PAD.right - w);
        let row = rowEnd.findIndex((end) => left > end + 4);
        if (row === -1) row = rowEnd.length < MAX_TAG_ROWS ? rowEnd.length : rowEnd.indexOf(Math.min(...rowEnd));
        rowEnd[row] = Math.max(rowEnd[row] ?? -Infinity, left + w);
        out.push({ x: s.x, left, row, mark, w });
      }
    }
    return out;
  }, [slots, marks, width]);

  // The plot starts below the tags; a row of room is always kept so the chart does not jump as tags come and go.
  const tagRows = tags.reduce((n, t) => Math.max(n, t.row + 1), 0);
  const top = 12 + Math.max(MIN_TAG_ROWS, tagRows) * TAG_ROW;
  const innerH = height - top - PAD.bottom;

  const layout = useMemo(() => {
    const vals = shown.map((p) => num(p.oraclePx));
    let lo = vals.length ? Math.min(...vals) : 0;
    let hi = vals.length ? Math.max(...vals) : 1;
    const minSpan = (hi || 1) * 0.0004;
    if (hi - lo < minSpan) {
      const mid = (hi + lo) / 2;
      lo = mid - minSpan / 2;
      hi = mid + minSpan / 2;
    }
    const span = hi - lo;
    // Include the entry and level lines only when they are close enough not to flatten the line.
    const near = (v: number | null) => v !== null && v >= lo - span * 1.5 && v <= hi + span * 1.5;
    let dLo = lo;
    let dHi = hi;
    for (const v of [entry, level, draftLevel]) if (near(v)) (dLo = Math.min(dLo, v!), (dHi = Math.max(dHi, v!)));
    const pad = (dHi - dLo) * 0.16;
    dLo -= pad;
    dHi += pad;
    const y = (v: number) => top + (1 - (v - dLo) / (dHi - dLo)) * innerH;

    // A step per print: the price holds until the next print lands.
    let path = "";
    shown.forEach((p, i) => {
      const x = slots[i].x.toFixed(1);
      const py = y(num(p.oraclePx)).toFixed(1);
      path += i === 0 ? `M${x} ${py}` : `H${x}V${py}`;
    });

    // Gridlines at round prices, about GRID_GAP apart, labelled no finer than the market's own price precision.
    const { ticks, step } = niceTicks(dLo, dHi, Math.max(3, Math.round(innerH / GRID_GAP)));
    const dp = Math.min(pxDecimals(market), stepDecimals(step));

    return { y, path, ticks, dp, near };
  }, [shown, slots, top, innerH, entry, level, draftLevel, market]);

  const { y, path, ticks, dp } = layout;
  const latest = shown.at(-1);
  const latestSlot = slots[shown.length - 1];

  // Print numbers along the bottom, spaced so they never touch.
  const axis = useMemo(() => {
    const real = slots.filter((s) => !s.ghost);
    if (real.length < 2) return [];
    const dx = real[1].x - real[0].x;
    const step = STEPS.find((k) => k * dx >= AXIS_GAP) ?? STEPS[STEPS.length - 1];
    return real.filter((s) => s.idx % step === 0 && s.x > PAD.left + 12 && s.x < width - PAD.right - 12);
  }, [slots, width]);

  const hoverSlot = hover !== null ? slots.find((s) => s.idx === hover && !s.ghost) : undefined;
  const hoverPrint = hoverSlot?.print;
  const hoverPrev = hoverPrint ? shown[shown.findIndex((p) => p.idx === hoverPrint.idx) - 1] : undefined;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let best: Slot | undefined;
    for (const s of slots) if (!s.ghost && (!best || Math.abs(s.x - x) < Math.abs(best.x - x))) best = s;
    setHover(best ? best.idx : null);
  };

  // The liquidation level that matters: the live order's, or the draft's quote while composing.
  const shownLevel = level ?? draftLevel;
  const levelIsDraft = level === null && draftLevel !== null;
  const levelPinned = shownLevel !== null && !layout.near(shownLevel);
  // A long's level is below the price and a short's is above it.
  const levelAbove = !isLong;
  const levelDistance = shownLevel !== null && latest && atLatest ? Math.abs((shownLevel - num(latest.oraclePx)) / num(latest.oraclePx)) * 100 : null;
  const plotBottom = top + innerH;

  // The labels on the entry and level lines go where nothing crosses them: the left edge if it is clear, else the right
  // edge, else the first clear stretch between. The price line and the mark lines are the things to keep clear of.
  const lineLabels = useMemo(() => {
    const out: { entry?: LabelSpot; level?: LabelSpot } = {};
    if (!latest) return out;
    const bottom = top + innerH;
    const obstacles: Box[] = [];
    const lined = new Set<number>();
    for (const t of tags) {
      if (lined.has(t.x)) continue;
      lined.add(t.x);
      obstacles.push({ x0: t.x - 3, x1: t.x + 3, y0: top, y1: bottom });
    }
    for (const s of slots) {
      if (lined.has(s.x) || !(marks.get(s.idx) ?? []).some((m) => m.tone === "step")) continue;
      lined.add(s.x);
      obstacles.push({ x0: s.x - 3, x1: s.x + 3, y0: top, y1: bottom });
    }
    shown.forEach((p, i) => {
      const py = layout.y(num(p.oraclePx));
      const next = slots[i + 1];
      obstacles.push({ x0: slots[i].x, x1: next && !next.ghost ? next.x : slots[i].x, y0: py - 2, y1: py + 2 });
      if (i > 0) {
        const prev = layout.y(num(shown[i - 1].oraclePx));
        obstacles.push({ x0: slots[i].x - 2, x1: slots[i].x + 2, y0: Math.min(prev, py), y1: Math.max(prev, py) });
      }
    });

    const taken: Box[] = [];
    const place = (text: string, base: number): LabelSpot => {
      const w = text.length * LABEL_CHAR_W;
      const right = width - PAD.right - 4;
      const candidates: LabelSpot[] = [
        { x: PAD.left + 2, base, anchor: "start" },
        { x: right, base, anchor: "end" },
      ];
      for (let x = PAD.left + 26; x + w < right - 24; x += 24) candidates.push({ x, base, anchor: "start" });
      let best = candidates[0];
      let bestScore = Infinity;
      for (const c of candidates) {
        const x0 = c.anchor === "start" ? c.x : c.x - w;
        const box: Box = { x0: x0 - 2, x1: x0 + w + 2, y0: base - 12, y1: base + 3 };
        const score = obstacles.filter((o) => overlaps(box, o)).length + 10 * taken.filter((o) => overlaps(box, o)).length;
        if (score < bestScore) {
          best = c;
          bestScore = score;
          if (score === 0) break;
        }
      }
      const x0 = best.anchor === "start" ? best.x : best.x - w;
      taken.push({ x0: x0 - 2, x1: x0 + w + 2, y0: base - 12, y1: base + 3 });
      return best;
    };

    if (level !== null && layout.near(level)) out.level = place(`Liquidation price ${toPx(level, market)}`, layout.y(level) + (levelAbove ? 14 : -5));
    else if (draftLevel !== null && level === null && layout.near(draftLevel)) out.level = place(`New order, liquidation price ${toPx(draftLevel, market)}`, layout.y(draftLevel) + (levelAbove ? 14 : -5));
    if (entry !== null && layout.near(entry)) out.entry = place(`Entry ${toPx(entry, market)}`, layout.y(entry) - 5);
    return out;
  }, [latest, tags, slots, marks, shown, layout, top, innerH, width, entry, level, draftLevel, levelAbove, market]);

  return (
    <div className="chart" ref={box}>
      {shown.length === 0 ? (
        <div className="chart__empty" style={{ height }}>
          Waiting for the first {MARKETS[market]} print.
        </div>
      ) : (
        <>
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`${MARKETS[market]} oracle price per print. Latest ${px(latest!.oraclePx, market)} at print ${latest!.idx}.`}
          >
            <defs>
              <linearGradient id={`${gradId}-zone`} x1="0" x2="0" y1={levelAbove ? "0" : "1"} y2={levelAbove ? "1" : "0"}>
                <stop offset="0" stopColor="var(--short)" stopOpacity={levelIsDraft ? 0.12 : 0.2} />
                <stop offset="1" stopColor="var(--short)" stopOpacity="0" />
              </linearGradient>
            </defs>

            <YAxis ticks={ticks} y={y} x0={PAD.left} x1={width - PAD.right} label={(v) => tickLabel(v, dp)} avoid={latest && atLatest ? [y(num(latest.oraclePx))] : []} />

            {/* Beyond the liquidation level: a tint from the level to the edge when it is on the chart, a glow at the edge when it is off it. */}
            {shownLevel !== null &&
              (layout.near(shownLevel) ? (
                <rect
                  className={levelIsDraft ? "chart__zone chart__zone--draft" : "chart__zone"}
                  x={PAD.left}
                  width={width - PAD.right - PAD.left}
                  y={isLong ? y(shownLevel) : top}
                  height={isLong ? Math.max(0, plotBottom - y(shownLevel)) : Math.max(0, y(shownLevel) - top)}
                />
              ) : (
                <rect className="chart__glow" x={PAD.left} width={width - PAD.right - PAD.left} y={levelAbove ? top : plotBottom - 34} height={34} fill={`url(#${gradId}-zone)`} />
              ))}

            {ghosts.length > 0 && latestSlot && (
              <rect className={previewing ? "chart__ghost chart__ghost--draft" : "chart__ghost"} x={latestSlot.x} y={top} width={Math.max(0, slots.at(-1)!.x - latestSlot.x)} height={innerH} />
            )}

            {entry !== null && layout.near(entry) && (
              <g className="chart__entry">
                <line x1={PAD.left} x2={width - PAD.right} y1={y(entry)} y2={y(entry)} />
                {lineLabels.entry && (
                  <text x={lineLabels.entry.x} y={lineLabels.entry.base} textAnchor={lineLabels.entry.anchor}>
                    Entry {toPx(entry, market)}
                  </text>
                )}
              </g>
            )}
            {level !== null && layout.near(level) && (
              <g className="chart__level">
                <line x1={PAD.left} x2={width - PAD.right} y1={y(level)} y2={y(level)} />
                {lineLabels.level && (
                  <text x={lineLabels.level.x} y={lineLabels.level.base} textAnchor={lineLabels.level.anchor}>
                    Liquidation price {toPx(level, market)}
                  </text>
                )}
              </g>
            )}
            {draftLevel !== null && layout.near(draftLevel) && level === null && (
              <g className="chart__level chart__level--draft">
                <line x1={PAD.left} x2={width - PAD.right} y1={y(draftLevel)} y2={y(draftLevel)} />
                {lineLabels.level && (
                  <text x={lineLabels.level.x} y={lineLabels.level.base} textAnchor={lineLabels.level.anchor}>
                    New order, liquidation price {toPx(draftLevel, market)}
                  </text>
                )}
              </g>
            )}

            {/* A tagged mark's line starts at the foot of its tag, so a tag in an upper row still reads as attached to its print. */}
            {tags.map((t, i) => (
              <line
                key={`l${i}`}
                className={`chart__mline chart__mline--${t.mark.tone}${t.mark.ghost ? " chart__mline--ghost" : ""}`}
                x1={t.x}
                x2={t.x}
                y1={6 + t.row * TAG_ROW + TAG_H}
                y2={plotBottom}
              />
            ))}
            {slots
              .filter((s) => (marks.get(s.idx) ?? []).some((mark) => mark.tone === "step"))
              .map((s) => (
                <line key={`s${s.idx}`} className="chart__mline chart__mline--step" x1={s.x} x2={s.x} y1={top - 8} y2={plotBottom} />
              ))}

            {ghosts.map((idx) => {
              const s = slots.find((q) => q.idx === idx)!;
              return <circle key={`g${idx}`} className="chart__gdot" cx={s.x} cy={top + innerH / 2} r={4} />;
            })}

            <path className="chart__line" d={path} />
            {shown.length <= 60 &&
              shown.map((p, i) => <circle key={p.idx} className="chart__dot" cx={slots[i].x} cy={y(num(p.oraclePx))} r={atLatest && p.idx === latest!.idx ? 0 : 2} />)}

            {latestSlot && atLatest && (
              <>
                <circle className="chart__now-ring" cx={latestSlot.x} cy={y(num(latest!.oraclePx))} r={7} />
                <circle className="chart__now" cx={latestSlot.x} cy={y(num(latest!.oraclePx))} r={3.5} />
                <Pill x={width - PAD.right + 4} y={y(num(latest!.oraclePx))} w={PAD.right - 6} text={px(latest!.oraclePx, market)} />
              </>
            )}

            {/* The print axis */}
            <XAxis items={axis.map((s) => ({ x: s.x, label: String(s.idx) }))} y={plotBottom} x0={PAD.left} x1={width - PAD.right} />

            {hoverSlot && hoverPrint && (
              <g className="chart__hover">
                <line x1={hoverSlot.x} x2={hoverSlot.x} y1={top} y2={plotBottom} />
                <line x1={PAD.left} x2={width - PAD.right} y1={y(num(hoverPrint.oraclePx))} y2={y(num(hoverPrint.oraclePx))} />
                <circle cx={hoverSlot.x} cy={y(num(hoverPrint.oraclePx))} r={4} />
                <Pill x={width - PAD.right + 4} y={y(num(hoverPrint.oraclePx))} w={PAD.right - 6} text={px(hoverPrint.oraclePx, market)} tone="ref" />
              </g>
            )}

            {tags.map((t, i) => (
              <g key={`t${i}`} className={`chart__tag chart__tag--${t.mark.tone}${t.mark.ghost ? " chart__tag--ghost" : ""}`} transform={`translate(${t.left}, ${6 + t.row * TAG_ROW})`}>
                <rect width={t.w} height={TAG_H} rx={4} />
                <text x={t.w / 2} y={11} textAnchor="middle">
                  {t.mark.label}
                </text>
              </g>
            ))}

            {levelPinned && shownLevel !== null && (
              <g className={levelIsDraft ? "chart__pinned chart__pinned--draft" : "chart__pinned"}>
                <text x={width - PAD.right - 4} y={levelAbove ? top + 14 : plotBottom - 8} textAnchor="end">
                  {levelIsDraft ? "New order, liquidation price" : "Liquidation price"} {toPx(shownLevel, market)}
                  {levelDistance !== null && `, ${pct(levelDistance, 2)} ${levelAbove ? "above" : "below"}`}
                </text>
              </g>
            )}

            <rect className="chart__hit" x={PAD.left} y={0} width={width - PAD.left - PAD.right} height={height} onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
          </svg>

          {hoverSlot && hoverPrint && (
            <div className="chart__tip" style={{ left: Math.min(Math.max(hoverSlot.x + 14, 4), width - 214), top: top + 6 }}>
              <div className="chart__tip-head">
                Print {hoverPrint.idx}
                <span>{new Date(hoverPrint.srcTimeMs).toLocaleTimeString([], { hour12: false })}</span>
              </div>
              <dl>
                <div>
                  <dt>Oracle</dt>
                  <dd>{px(hoverPrint.oraclePx, market)}</dd>
                </div>
                <div>
                  <dt>Book mid</dt>
                  <dd>
                    {px(hoverPrint.midPx, market)} <span>{bp(diffBp(hoverPrint.midPx, hoverPrint.oraclePx), 1)}</span>
                  </dd>
                </div>
                {hoverPrev && (
                  <div>
                    <dt>Change</dt>
                    <dd>{bp(diffBp(hoverPrint.oraclePx, hoverPrev.oraclePx), 1)}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </>
      )}
    </div>
  );
}
