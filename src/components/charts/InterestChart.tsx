import { useMemo, type ReactNode } from "react";
import { useNow } from "../../hooks/data";
import { bucketSize, sampleSteps, windowFor } from "../../lib/grid";
import { money } from "../../lib/format";
import { fullTime } from "../../lib/time";
import type { Step } from "../../lib/series";
import type { ChartMode } from "./engine";
import { TimeChart, type Hover, type Layer, type Point } from "./TimeChart";

interface Props {
  mode: ChartMode;
  /** What was held open on each side after each change, oldest first, each starting at zero. */
  long: Step[];
  short: Step[];
  height?: number;
  label: string;
  empty: ReactNode;
  loading?: boolean;
}

const seconds = (ms: number) => Math.floor(ms / 1000);
const size = (v: number) => money(v, 0);

/**
 * What traders held open against the vault, long and short, over time. Both sides are flat between fills, as the positions are,
 * and sit on one grid; a legend reads both at the pointer, and the newest reading of each is tagged on the axis.
 */
export function InterestChart({ mode, long, short, height = 190, label, empty, loading }: Props) {
  const now = useNow(30_000);
  const built = useMemo(() => {
    const first = Math.min(long[0]?.t ?? Infinity, short[0]?.t ?? Infinity);
    if (!Number.isFinite(first)) return null;
    const win = windowFor(first, now);
    const step = bucketSize(win.to - win.from, 64);
    const points = (steps: Step[]): Point[] => sampleSteps(steps, win.from, win.to, step).map((g) => ({ time: seconds(g.t), value: g.v }));
    return { win, long: points(long), short: points(short) };
  }, [long, short, now]);

  const layers = useMemo<Layer[]>(
    () =>
      built
        ? [
            { id: "long", kind: "line", tone: "long", width: 2, stepped: true, title: "Long", format: size, data: built.long },
            { id: "short", kind: "line", tone: "short", width: 2, stepped: true, title: "Short", format: size, data: built.short },
          ]
        : [],
    [built],
  );
  const range = built ? { from: seconds(built.win.from), to: seconds(built.win.to) } : undefined;

  const legend = (h: Hover | null) => {
    const l = (h?.values.long as Point | undefined) ?? built?.long.at(-1);
    const s = (h?.values.short as Point | undefined) ?? built?.short.at(-1);
    if (!l || !s) return null;
    return (
      <>
        <span className="is-up">
          Long <b>{size(l.value)}</b>
        </span>
        <span className="is-down">
          Short <b>{size(s.value)}</b>
        </span>
        {h && <span>{fullTime(h.time * 1000)}</span>}
      </>
    );
  };

  return <TimeChart mode={mode} layers={layers} height={height} range={range} label={label} empty={empty} loading={loading} legend={mode === "advanced" ? legend : undefined} />;
}
