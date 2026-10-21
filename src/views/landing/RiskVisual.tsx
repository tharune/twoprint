import { useMemo, useState } from "react";
import { useApp } from "../../app-context";
import { Segmented } from "../../components/ui";
import { EXAMPLE_COLLATERAL, examplePosition, premiumParams, premiumRate } from "../../lib/premium";
import { stepGeometry, stepTrail } from "../../lib/steps";
import { stripScenarios } from "../../lib/strip";
import { useInView, useStory } from "./motion";

const W = 1000;
const H = 360;
/** Updates before and after the event, so the picture opens on a quiet stretch and ends once it is settled. */
const BEFORE = 14;
const AFTER = 9;

type Id = "wick" | "two";

/**
 * The two-update rule as a story: the prices arrive one at a time, and a counter above the picture fills as updates land past your
 * level. One fills half of it and costs the reserved premium; the next price back on the safe side empties it; a second in a row
 * fills it and liquidates. The walk is invented and the rule is the contract's. The premium and the level follow the deployed
 * parameters. The two cases take turns on their own until the reader picks one.
 */
export function RiskVisual() {
  const { snap } = useApp();
  const [id, setId] = useState<Id>("wick");
  // Only once the reader has picked a case does the result speak up to a screen reader, so the automatic turns are not announced.
  const [picked, setPicked] = useState(false);
  const [replay, setReplay] = useState(0);
  const [ref, on] = useInView<HTMLElement>();
  const { multE4, floorE8 } = premiumParams(snap?.pm);
  const example = examplePosition(EXAMPLE_COLLATERAL, 100, premiumRate(multE4, floorE8));
  const scenarios = useMemo(() => stripScenarios({ levelBp: example.distance * 1e4 }), [example.distance]);
  const sc = scenarios.find((s) => s.id === id)!;
  const event = sc.marks[0].idx; // the first print beyond the level
  const from = event - BEFORE;
  const values = sc.prints.slice(from, event + AFTER + 1);
  const level = -example.distance * 1e4;
  // How many updates in a row are past the level at each update, and the two moments the rule is about.
  const runAt: number[] = [];
  values.forEach((v, i) => runAt.push(v < level ? (runAt[i - 1] ?? 0) + 1 : 0));
  const liqIdx = runAt.findIndex((r) => r >= 2);
  const backIdx = runAt.findIndex((r, i) => r === 0 && i > 0 && runAt[i - 1] > 0);
  const pos = useStory(values.length, on, {
    step: 300,
    hold: 4200,
    restart: replay,
    pace: (j) => {
      if (runAt[j] === 1) return { rest: 1100 }; // the first update past the level
      if (runAt[j] === 2) return { rest: 1500 }; // the second in a row: liquidated
      if (j === backIdx && liqIdx < 0) return { rest: 800 }; // back on the safe side
      return {};
    },
    onLoop: () => {
      if (!picked) setId((v) => (v === "wick" ? "two" : "wick"));
    },
  });
  const n = Math.floor(pos + 1e-6) + 1; // updates the point has reached
  const lo = Math.min(...values, level) - 18;
  const hi = Math.max(...values, 0) + 30;
  const g = stepGeometry(values, W, H, { top: 14, bottom: 14, left: 100, lo, hi })!; // the left gutter holds the line labels
  const pctX = (v: number) => `${(v / W) * 100}%`;
  const pctY = (v: number) => `${(v / H) * 100}%`;

  // Updates past the level in a row, as the story stands: it climbs with each one past and falls back to nothing on one that isn't.
  let run = 0;
  let liquidatedAt = -1;
  let wasPast = false;
  for (let i = 0; i < n; i++) {
    run = values[i] < level ? run + 1 : 0;
    if (values[i] < level) wasPast = true;
    if (run >= 2 && liquidatedAt < 0) liquidatedAt = i;
  }
  const finished = n >= values.length;
  const trail = stepTrail(g, values, liquidatedAt >= 0 ? Math.min(pos, liquidatedAt) : pos);
  const closed = liquidatedAt >= 0 && pos > liquidatedAt ? stepTrail(g, values, pos, liquidatedAt) : null;
  const point = stepTrail(g, values, pos);
  const pips = liquidatedAt >= 0 ? 2 : Math.min(run, 2);

  const live =
    liquidatedAt >= 0
      ? { tone: "short", head: "Liquidated", text: `A second update in a row past your liquidation price closes the position. You lose the ${EXAMPLE_COLLATERAL.toFixed(2)} tUSDC you put in and nothing more.` }
      : run === 1
        ? { tone: "warn", head: "One update past it", text: `That costs the premium you set aside, ${example.premium.toFixed(2)} tUSDC. It isn’t enough to liquidate you on its own.` }
        : wasPast
          ? { tone: "ok", head: "Back on the safe side", text: "The count starts again from zero. You’re still open." }
          : { tone: "", head: "You’re long at 100x", text: "The price is above your liquidation price. Watch the counter." };
  // At the end the one-update case sums up; the two-update case keeps the "Liquidated" text it already has, so nothing flashes open
  // again. What it adds is the fee line, which pops in below.
  const result = { tone: "", head: "You stay open", text: `One price update went past your liquidation price and used up the premium you set aside, ${example.premium.toFixed(2)} tUSDC. The next update was back on the safe side.` };
  const say = finished && id === "wick" ? result : live;

  return (
    <figure ref={ref} className="stage rk sq" aria-label="A price line that dips past the liquidation price, shown for one price update and for two in a row.">
      <div className="rk__bar">
        <Segmented
          label="What happens"
          value={id}
          onChange={(v) => {
            setPicked(true);
            setId(v);
            setReplay((r) => r + 1);
          }}
          options={[
            { value: "wick", label: "One update past it" },
            { value: "two", label: "Two updates in a row" },
          ]}
        />
        <div className="rk__count" aria-hidden="true">
          <span>In a row past it</span>
          <i data-on={pips >= 1 || undefined} data-dead={pips >= 2 || undefined} />
          <i data-on={pips >= 2 || undefined} data-dead={pips >= 2 || undefined} />
        </div>
      </div>

      <div className="rk__plot" key={id} data-hit={liquidatedAt >= 0 || undefined}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <rect className={run > 0 || liquidatedAt >= 0 ? "rk__zone rk__zone--hot" : "rk__zone"} x="0" y={g.y(level)} width={W} height={H - g.y(level)} />
          <line className="rk__entry" x1="0" x2={W} y1={g.y(0)} y2={g.y(0)} />
          <line className="rk__level" x1="0" x2={W} y1={g.y(level)} y2={g.y(level)} />
          <path className="rk__line" d={trail.d} />
          {closed && <path className="rk__line rk__line--closed" d={closed.d} />}
        </svg>
        <span className="rk__tag" style={{ top: pctY(g.y(0)) }}>
          Entry
        </span>
        <span className="rk__tag rk__tag--level" style={{ top: pctY(g.y(level)) }}>
          Liquidation price
        </span>
        {values.slice(0, n).map((v, i) =>
          v < level ? (
            <span key={i} className="rk__dot" data-dead={liquidatedAt >= 0 && i > liquidatedAt ? "" : undefined} data-n={runAt[i] <= 2 ? runAt[i] : undefined} style={{ left: pctX(g.x(i)), top: pctY(g.y(v)) }}>
              {runAt[i] <= 2 ? runAt[i] : null}
            </span>
          ) : null,
        )}
        {liquidatedAt >= 0 && <span className="rk__flash" aria-hidden="true" />}
        {liquidatedAt >= 0 && (
          <span className="rk__stamp" style={{ left: pctX(g.x(liquidatedAt - 1)), top: pctY(g.y(values[liquidatedAt])) }}>
            Liquidated
          </span>
        )}
        <span className="sq__head" data-tone={liquidatedAt >= 0 ? "short" : run > 0 ? "warn" : undefined} style={{ left: pctX(point.x), top: pctY(point.y) }} />
      </div>

      <div className="rk__result" aria-live={picked && finished ? "polite" : undefined}>
        <div key={say.head} className="sq__say-in">
          <b className={say.tone === "short" ? "text-short" : say.tone === "ok" ? "text-long" : undefined}>{say.head}</b>
          <p>{say.text}</p>
        </div>
        {id === "two" && (
          <p className="rk__fee" data-on={finished || undefined}>
            <span aria-hidden="true">✓</span> There’s no liquidation fee
          </p>
        )}
      </div>
      <p className="rk__fine">Example: a 100x BTC long. The prices are made up; the rule is how the contracts really work.</p>
    </figure>
  );
}
