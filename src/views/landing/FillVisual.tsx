import { stepGeometry, stepTrail } from "../../lib/steps";
import { useInView, useStory } from "./motion";

// A made-up run of prices in arbitrary units: it wanders, you order at print 7, and the fill is print 9. The price at the fill
// is a print that did not exist at the commit, which is the whole point of the picture.
const SERIES = [0, 3, 1, 4, 2, 5, 3, 6, 11, 14, 13, 15, 12, 14];
const COMMIT = 7;
const FILL = 9;
const W = 1000;
const H = 400;
const TOP = 132;
const BOTTOM = 16;

const MARKS = [
  { i: COMMIT, label: "You order", short: "Order", row: 0 },
  { i: COMMIT + 1, label: "1st update", short: "1st", row: 1 },
  { i: FILL, label: "2nd update, you fill", short: "Fill", row: 2 },
];
const ROW_Y = [8, 52, 96];
const STEPS = ["You order", "1st update", "2nd update: you fill"];

/** What is said under the picture at each point of the story, by how many prints have landed. */
function say(n: number): string {
  if (n <= COMMIT) return "Prices are posted every few seconds. Each one is an update.";
  if (n === COMMIT + 1) return "You place an order. Its price isn’t set yet.";
  if (n === COMMIT + 2) return "The first update lands. Nothing fills yet.";
  if (n === FILL + 1) return "The second update lands, and you fill at that price.";
  return "Your order waits for a qualifying future print, whose price the signer supplies. Later prices don’t change your fill.";
}

/**
 * How an order fills, played as a story: the prices arrive one at a time, you order, the first update passes without filling you, and
 * you fill on the second. The steps above light up as each happens and the line underneath says what just happened. It starts over
 * after a pause while in view.
 */
export function FillVisual() {
  const [ref, on] = useInView<HTMLElement>();
  const pos = useStory(SERIES.length, on, {
    step: 300,
    hold: 4400,
    // Rest on the three moments the picture is about: the order, the first update, and the fill.
    pace: (j) => ({ rest: j === COMMIT ? 600 : j === COMMIT + 1 ? 500 : j === FILL ? 1100 : 0 }),
  });
  const n = Math.floor(pos + 1e-6) + 1; // prints the point has reached
  const g = stepGeometry(SERIES, W, H, { top: TOP, bottom: BOTTOM, lo: -2, hi: 17 })!;
  const pctX = (v: number) => `${(v / W) * 100}%`;
  const pctY = (v: number) => `${(v / H) * 100}%`;
  const done = [n > COMMIT, n > COMMIT + 1, n > FILL];
  const now = done.lastIndexOf(true);
  const trail = stepTrail(g, SERIES, pos);
  return (
    <figure ref={ref} className="stage fv sq" aria-label="An order fills on the second price update after you place it, at a price that did not exist when you ordered.">
      <ol className="sq__steps" aria-hidden="true">
        {STEPS.map((s, i) => {
          const state = !done[i] ? "idle" : i === now && n <= FILL + 1 ? "now" : "done";
          return (
            <li key={s} className="sq__step" data-state={state}>
              <i>{state === "done" ? "✓" : i + 1}</i>
              {s}
            </li>
          );
        })}
      </ol>
      <div className="fv__plot">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          {n > COMMIT && <line className="fv__ref" x1={g.x(COMMIT)} x2={W} y1={g.y(SERIES[COMMIT])} y2={g.y(SERIES[COMMIT])} />}
          {MARKS.map((m) => n > m.i && <line key={m.i} className="fv__guide" x1={g.x(m.i)} x2={g.x(m.i)} y1={ROW_Y[m.row] + 22} y2={H - BOTTOM} />)}
          {n > FILL && <line className="fv__gap" x1={g.x(FILL)} x2={g.x(FILL)} y1={g.y(SERIES[FILL - 1])} y2={g.y(SERIES[COMMIT])} />}
          <path className="fv__line" d={trail.d} />
        </svg>
        {MARKS.map((m) =>
          n > m.i ? (
            <span key={m.i} className="fv__mark" style={{ left: pctX(g.x(m.i)), top: pctY(ROW_Y[m.row]) }}>
              <span className="fv__long">{m.label}</span>
              <span className="fv__short">{m.short}</span>
            </span>
          ) : null,
        )}
        {n > FILL && (
          <>
            <span className="fv__note" style={{ left: pctX(g.x(FILL) + 14), top: pctY(g.y(SERIES[COMMIT])) }}>
              Price when you ordered
            </span>
            <span className="fv__dot" style={{ left: pctX(g.x(FILL)), top: pctY(g.y(SERIES[FILL])) }} />
          </>
        )}
        <span className="sq__head" style={{ left: pctX(trail.x), top: pctY(trail.y) }} />
      </div>
      <p className="sq__say" key={say(n)} aria-hidden="true">
        {say(n)}
      </p>
      <figcaption className="fv__cap">An illustration: the prices are made up and exaggerated.</figcaption>
    </figure>
  );
}
