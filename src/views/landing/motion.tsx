import { useEffect, useRef, useState, type CSSProperties, type ElementType, type HTMLAttributes, type ReactNode } from "react";
import { cx } from "../../lib/cx";

/** Whether the page may animate: not when the reader asked for less motion, and not without IntersectionObserver. */
export const canAnimate = () => typeof window !== "undefined" && "IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * True once the element has been scrolled into view, and it stays true. An element that is already above the viewport counts as
 * seen, so following a link to a section never leaves the ones above it hidden.
 */
export function useSeen<T extends Element>(margin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (!("IntersectionObserver" in window)) {
      setSeen(true);
      return;
    }
    const watch = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting || e.boundingClientRect.top < 0)) {
          setSeen(true);
          watch.disconnect();
        }
      },
      { rootMargin: margin, threshold: 0.12 },
    );
    watch.observe(el);
    return () => watch.disconnect();
  }, [seen, margin]);
  return [ref, seen] as const;
}

type Tag = "div" | "section" | "header" | "ul" | "li" | "p";

/**
 * Brings its children in once they scroll into view. Everything it hides is shown again when the page is not animating, and
 * `data-in` lets a picture inside start its own drawing at the same moment.
 */
export function Reveal({
  as = "div",
  delay = 0,
  className,
  style,
  children,
  ...rest
}: { as?: Tag; delay?: number; className?: string; style?: CSSProperties; children: ReactNode } & Omit<HTMLAttributes<HTMLElement>, "style" | "className">) {
  const [ref, seen] = useSeen<HTMLElement>();
  const Comp = as as ElementType;
  return (
    <Comp ref={ref} className={cx("rv", className)} data-in={seen || undefined} style={{ ...style, ["--rv-d" as string]: `${delay}ms` }} {...rest}>
      {children}
    </Comp>
  );
}

/**
 * True while the element is on screen and the page is visible, and false again when it leaves. What loops uses this, so nothing
 * runs off screen or in a background tab.
 */
export function useInView<T extends Element>(margin = "0px") {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    let seen = false;
    const sync = () => setOn(seen && document.visibilityState === "visible");
    const watch = new IntersectionObserver(
      (entries) => {
        seen = entries.some((e) => e.isIntersecting);
        sync();
      },
      { rootMargin: margin, threshold: 0.2 },
    );
    watch.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      watch.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [margin]);
  return [ref, on] as const;
}

/**
 * A figure that counts up to its first number the first time it scrolls into view, so "100x" climbs to 100. Text with no number
 * to count (or a zero), and a page that may not animate, show it as written. Screen readers get the finished text.
 */
export function CountUp({ text }: { text: string }) {
  const [ref, seen] = useSeen<HTMLSpanElement>("0px");
  const m = /^(\D*)(\d+(?:\.\d+)?)([\s\S]*)$/.exec(text);
  const target = m ? parseFloat(m[2]) : 0;
  const decimals = m && m[2].includes(".") ? m[2].split(".")[1].length : 0;
  const run = !!m && target > 0 && canAnimate();
  const [v, setV] = useState(run ? 0 : target);
  useEffect(() => {
    if (!run || !seen) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / 1100);
      setV(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, seen, target]);
  if (!m || !run) return <>{text}</>;
  return (
    <span ref={ref} aria-label={text}>
      <span aria-hidden="true">
        {m[1]}
        {v.toFixed(decimals)}
        {m[3]}
      </span>
    </span>
  );
}

/** How the story moves onto print `j`: how long the point takes to get there, and how long it rests there. */
export type Pace = { travel: number; rest: number };

/**
 * A playhead for a picture told as a story. It returns `pos`, the point's place along the series in prints (3.5 is halfway between
 * the 3rd and 4th), moving at `step` ms per print unless `pace(j)` says how to reach and rest on print `j`; that is how a key moment
 * gets a pause and what comes after it can hurry. At the end it holds for `hold` ms, calls `onLoop` and starts over. `restart`
 * replays on demand. A page that may not animate gets the finished picture at once. Everything is drawn from this one number, so
 * the line can only reach where the point has been.
 */
export function useStory(total: number, active: boolean, opts: { step?: number; hold?: number; pace?: (j: number) => Partial<Pace>; onLoop?: () => void; restart?: number } = {}) {
  const { step = 300, hold = 3600, restart = 0 } = opts;
  const animate = canAnimate();
  const [pos, setPos] = useState(animate ? 0 : total - 1);
  const loop = useRef(opts.onLoop);
  loop.current = opts.onLoop;
  const paceRef = useRef(opts.pace);
  paceRef.current = opts.pace;
  useEffect(() => {
    if (!animate) {
      setPos(total - 1);
      return;
    }
    if (!active) return;
    let raf = 0;
    let t0 = performance.now();
    // When the point leaves print j-1 and arrives at print j, and when it leaves j again.
    const plan = () => {
      const go: number[] = [0];
      const arrive: number[] = [600];
      const leave: number[] = [600];
      for (let j = 1; j < total; j++) {
        const p = paceRef.current?.(j) ?? {};
        go[j] = leave[j - 1];
        arrive[j] = go[j] + (p.travel ?? step);
        leave[j] = arrive[j] + (p.rest ?? 0);
      }
      return { go, arrive, leave };
    };
    let tl: ReturnType<typeof plan> | null = plan();
    const at = (t: number, tl: ReturnType<typeof plan>) => {
      if (t < tl.arrive[0]) return 0;
      for (let j = 1; j < total; j++) if (t < tl.arrive[j]) return j - 1 + Math.max(0, t - tl.go[j]) / (tl.arrive[j] - tl.go[j]); // resting on j-1 until the point sets off
      return total - 1;
    };
    let replan = 0;
    const tick = (now: number) => {
      if (!tl) {
        // `onLoop` may have changed what is being told; the plan is made from the picture that has rendered since, not the old one.
        if (now >= replan) {
          tl = plan();
          t0 = now;
        }
        raf = requestAnimationFrame(tick);
        return;
      }
      const t = now - t0;
      if (t > tl.leave[total - 1] + hold) {
        loop.current?.();
        tl = null;
        replan = now + 80;
        setPos(0);
      } else setPos(at(t, tl));
      raf = requestAnimationFrame(tick);
    };
    setPos(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, active, total, step, hold, restart]);
  return pos;
}
