import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Badge, Button } from "../../components/ui";
import { PUSH, pushTape } from "../../lib/compare";

/**
 * S2: "A push can't beat the oracle". A stepped, SYNTHETIC tape shaped like the Oct 10 (UTC) push: Hyperliquid's book mid
 * pushed +12 bp for 60 s while oraclePx holds. Each step runs the app's mirror of RiskMath.worseOfFill next to a
 * Papertrade-style mid fill. The displayed EV figures use an illustrative execution model
 * with market data and a fabricated push; none of this is a recording of the Oct 10 event.
 */
const TIMES = [-20, -10, 0, 2.5, 5, 10, 20, 30, 45, 60, 62.5, 65, 75, 90];
const TAPE = pushTape(TIMES);
const PEAK_CLOSE = TIMES.indexOf(10);
const HONEST_BUY = TIMES.indexOf(30);

interface Beat {
  badge: string;
  tone: "neutral" | "carbon" | "warn" | "short" | "long";
  text: string;
}

function beatAt(i: number): Beat {
  const s = TAPE[i];
  if (s.t < 0) return { badge: "Before", tone: "neutral", text: "The book mid and oraclePx agree. The attacker already holds a long on both venues." };
  if (s.t <= PUSH.rampSec) return { badge: "Push", tone: "warn", text: `The attacker buys Hyperliquid's book up: the mid rises ${PUSH.bp} bp in ${PUSH.rampSec} s. oraclePx, a validator-weighted median of CEX prices, holds.` };
  if (i === PEAK_CLOSE)
    return {
      badge: "Attacker closes",
      tone: "carbon",
      text: "The attacker sells at the peak. A Papertrade-style fill pays the pushed mid, +12 bp. Twoprint's sell fills at the worse of oraclePx and the basis-adjusted mid, which is oraclePx: pushing the book can't get you a better price than the oracle. It does save that leg its normal fill cost (M2: mean 0.14–0.46 bp, a mean, not a bound).",
    };
  if (s.t <= PUSH.holdUntilSec)
    return {
      badge: "Others pay",
      tone: "short",
      text: `While the push lasts, other traders' buys cost more: the worse-of now picks the pushed mid. A buy here fills ${s.buyFill.toFixed(1)} bp above oraclePx. M2 measured a mean of 11.6 bp for a 12 bp push, and a bigger push is capped at 15 bp per fill.`,
    };
  if (s.t < PUSH.holdUntilSec + PUSH.rampSec) return { badge: "Release", tone: "neutral", text: "The attacker lets the book go. The mid falls back toward oraclePx." };
  return { badge: "After", tone: "neutral", text: `The mid is back. The trailing basis moved only about ${PUSH.ewmaDragBp} bp (BTC; about 0.9 bp on ETH) over the 60 s push (M2), so fills return to normal.` };
}

function useWidth(ref: React.RefObject<HTMLElement | null>) {
  const [w, setW] = useState(560);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.max(260, Math.floor(el.clientWidth)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

const H = 230;
const PAD = { top: 30, right: 16, bottom: 24, left: 8 };
const bpTxt = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)} bp`;

export function PushScene() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const width = useWidth(box);
  const last = TAPE.length - 1;

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setStep((s) => (s >= last ? (setPlaying(false), s) : s + 1)), 900);
    return () => clearInterval(t);
  }, [playing, last]);

  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const lo = -4;
  const hi = 16;
  const t0 = TIMES[0];
  const t1 = TIMES[last];
  const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0)) * innerW;
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * innerH;
  const shown = TAPE.slice(0, step + 1);
  let mid = "";
  shown.forEach((s, i) => {
    mid += i === 0 ? `M${x(s.t).toFixed(1)} ${y(s.mid).toFixed(1)}` : `H${x(s.t).toFixed(1)}V${y(s.mid).toFixed(1)}`;
  });
  const cur = TAPE[step];
  const beat = beatAt(step);
  const atEnd = step >= last;

  return (
    <section className="cmp-push" aria-labelledby="push-title">
      <div className="cmp-push__head">
        <h2 id="push-title" className="cmp-h2">
          A push can&rsquo;t beat the oracle
        </h2>
        <Badge tone="warn">SYNTHETIC tape; figures from M2&rsquo;s Python model</Badge>
      </div>
      <p className="cmp-sub">
        Shaped like the Oct 10 (UTC) push: Hyperliquid&rsquo;s book mid pushed +{PUSH.bp} bp for {PUSH.holdUntilSec} s while oraclePx holds. A Papertrade-style fill pays the mid; Twoprint fills at the worse of oraclePx and the basis-adjusted mid.
      </p>

      <div className="strip-demo">
        <div className="chart" ref={box}>
          <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label={`Synthetic push tape up to t = ${cur.t} s: book mid ${bpTxt(cur.mid)}, oraclePx ${bpTxt(cur.oracle)}.`}>
            <g className="chart__grid">
              {[0, 5, 10, 15].map((v) => (
                <line key={v} x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} />
              ))}
            </g>
            <g className="chart__entry">
              <line x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} />
              <text x={PAD.left + 2} y={y(0) + 14}>
                oraclePx (holds)
              </text>
            </g>
            <g className="cmp-push__cap">
              <line x1={PAD.left} x2={width - PAD.right} y1={y(PUSH.clampBp)} y2={y(PUSH.clampBp)} />
              <text x={PAD.left + 2} y={y(PUSH.clampBp) - 5}>
                15 bp cap on the worse-of adjustment
              </text>
            </g>
            <path className="chart__line" d={mid} />
            {shown.map((s, i) => (
              <circle key={i} className="chart__dot" cx={x(s.t)} cy={y(s.mid)} r={i === step ? 0 : 2.5} />
            ))}
            <circle className="chart__now-ring" cx={x(cur.t)} cy={y(cur.mid)} r={8} />
            <circle className="chart__now" cx={x(cur.t)} cy={y(cur.mid)} r={4} />
            {/* a sell filled at this step on each venue */}
            <circle className="cmp-push__pt" cx={x(cur.t)} cy={y(cur.midFill)} r={6} />
            <rect className="cmp-push__tp" x={x(cur.t) - 5} y={y(cur.sellFill) - 5} width={10} height={10} transform={`rotate(45 ${x(cur.t)} ${y(cur.sellFill)})`} />
            {step >= PEAK_CLOSE && <line className="chart__mline chart__mline--fill" x1={x(10)} x2={x(10)} y1={PAD.top - 6} y2={PAD.top + innerH} />}
            {step >= PEAK_CLOSE && (
              <g className="chart__tag chart__tag--fill" transform={`translate(${Math.min(x(10) - 50, width - PAD.right - 100)}, 6)`}>
                <rect width={100} height={15} rx={4} />
                <text x={50} y={11} textAnchor="middle">
                  Attacker closes
                </text>
              </g>
            )}
            <text className="cmp-push__axis" x={PAD.left} y={H - 6}>
              t = {t0} s
            </text>
            <text className="cmp-push__axis" x={width - PAD.right} y={H - 6} textAnchor="end">
              t = {t1} s
            </text>
          </svg>
        </div>
        <ul className="cmp-push__legend" aria-hidden="true">
          <li><span className="sw sw--mid" /> HL book mid (pushed)</li>
          <li><span className="sw sw--oracle" /> oraclePx</li>
          <li><span className="mk mk--pt" /> A sell now, Papertrade-style mid fill</li>
          <li><span className="mk mk--tp" /> A sell now, Twoprint worse-of fill</li>
        </ul>

        <div className="strip-demo__controls">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (atEnd) setStep(0);
              setPlaying((p) => (atEnd ? true : !p));
            }}
          >
            {playing ? "Pause" : atEnd ? "Replay" : "Play"}
          </Button>
          <label className="strip-demo__scrub">
            <span className="sr-only">Step</span>
            <input
              type="range"
              className="slider"
              min={0}
              max={last}
              value={step}
              onChange={(e) => {
                setPlaying(false);
                setStep(Number(e.target.value));
              }}
              style={{ ["--p" as string]: `${(step / last) * 100}%` }}
              aria-valuetext={`t = ${cur.t} s`}
            />
          </label>
          <span className="strip-demo__idx">t = {cur.t} s</span>
        </div>

        <dl className="cmp-push__read">
          <div>
            <dt>HL book mid</dt>
            <dd>{bpTxt(cur.mid)}</dd>
          </div>
          <div>
            <dt>oraclePx</dt>
            <dd>{bpTxt(cur.oracle)}</dd>
          </div>
          <div>
            <dt>Papertrade-style fill (either side)</dt>
            <dd className={cur.midFill > 0 ? "text-short" : undefined}>{bpTxt(cur.midFill)}</dd>
          </div>
          <div>
            <dt>Twoprint sell fill</dt>
            <dd>{bpTxt(cur.sellFill)}</dd>
          </div>
          <div>
            <dt>Twoprint buy fill</dt>
            <dd className={cur.buyFill > 1 ? "text-short" : undefined}>{bpTxt(cur.buyFill)}</dd>
          </div>
        </dl>

        <div className="strip-demo__beat" aria-live="polite">
          <Badge tone={beat.tone} dot>
            {beat.badge}
          </Badge>
          <p>{beat.text}</p>
        </div>
        <p className="strip-demo__fine">
          SYNTHETIC tape; figures from M2's Python model. The strip is a made-up tape of the same shape, filled by the app&rsquo;s mirror of RiskMath.worseOfFill (t = {TIMES[HONEST_BUY]} s shows another trader&rsquo;s buy during the push). The figures below are M2&rsquo;s, from real recorded tape with a fabricated push. The Oct 10 tape itself isn&rsquo;t recorded.
        </p>
      </div>

      <div className="cmp-push__m2">
        <div>
          <h3>Attacker EV per round trip (M2, oracle holds)</h3>
          <p>
            <strong>Twoprint −0.24 to −11.7 bp</strong> against <strong>+6.8 to +9.1 bp</strong> for a Papertrade-style mid fill, across five strategies on BTC and ETH. No Twoprint round trip beat the oracle&rsquo;s own move in 609 windows × 5 strategies × 4 tapes.
          </p>
        </div>
        <div>
          <h3>What a push still does</h3>
          <ul>
            <li>It saves the attacker the normal fill cost on the leg that goes with it: mean 0.14–0.46 bp, a mean and not a bound (about $9 per push at the $200k OI cap).</li>
            <li>It overcharges other traders&rsquo; fills while it lasts: mean 11.6 bp for a 12 bp push, capped at 15 bp per fill (15% of margin at 100x).</li>
            <li>If the oracle itself follows part of a push, that is a real move in the settlement price: in M2&rsquo;s stress cases the attacker earns +1.7 to +5.6 bp on three of the five strategies, and only the OI caps limit it.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
