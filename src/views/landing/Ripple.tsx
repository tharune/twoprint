import { useEffect, useRef } from "react";
import { useThemeName } from "../../lib/theme";
import { canAnimate, useInView } from "./motion";

type Rgb = [number, number, number];

/** A CSS colour as red, green and blue, read back through a canvas so any colour the stylesheet uses will do. */
function rgbOf(value: string): Rgb {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return [128, 128, 128];
  g.fillStyle = value.trim() || "#888";
  g.fillRect(0, 0, 1, 1);
  const d = g.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

/** Pixels per cell of the water, which is simulated far coarser than the screen. */
const CELL = 6;
/** Steps of the water a second: lower is slower waves. */
const RATE = 30;
/** How much of a ripple is left after each step: a gentle touch settles in about two seconds, a hard sweep in about four. */
const DAMP = 0.95;
/** The page is calm when no part of the water is steeper than this, and then it stops being simulated. */
const CALM = 0.06;
/** Pixels between the dots of the grid, and how many dots between its crosshairs: a close, fine grid, so the page reads as full. */
const PITCH = 14;
const MAJOR = 5;

/**
 * The first screen's background: a fine grid of dots with a small crosshair at every fifth one, like technical graph paper, faint
 * and perfectly still. Nothing moves until the pointer does; then it drops ripples into a wave simulation underneath (bigger when
 * the pointer goes faster, and a click makes a splash), and the grid is what shows them: where a wave passes, the dots are pushed
 * along its slope and light up in the brand colour, so the paper seems to bend. The ripples spread, bounce off the edges and settle
 * until the grid is flat again. Nothing runs while the water is still or the page is off screen, and a reader who asked for less
 * motion gets the still grid.
 */
export function Ripple() {
  const [ref, playing] = useInView<HTMLDivElement>();
  const canvas = useRef<HTMLCanvasElement>(null);
  const theme = useThemeName();

  useEffect(() => {
    const box = ref.current;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!box || !cv || !ctx) return;

    const css = getComputedStyle(box);
    const ink = rgbOf(css.getPropertyValue("--ink"));
    const accent = rgbOf(css.getPropertyValue("--brand"));

    let cell = CELL;
    let gw = 0;
    let gh = 0;
    let bw = 0; // the page's size
    let bh = 0;
    let dpr = 1;
    let cur = new Float32Array(0);
    let prev = new Float32Array(0);
    let raf = 0;
    let running = false;
    let last = 0;
    let owed = 0;

    const fit = () => {
      const r = box.getBoundingClientRect();
      bw = r.width;
      bh = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cell = Math.max(CELL, Math.sqrt((bw * bh) / 40_000)); // a big screen gets bigger cells, so the work stays the same
      gw = Math.max(4, Math.ceil(bw / cell) + 1);
      gh = Math.max(4, Math.ceil(bh / cell) + 1);
      cur = new Float32Array(gw * gh);
      prev = new Float32Array(gw * gh);
      cv.width = Math.max(1, Math.round(bw * dpr));
      cv.height = Math.max(1, Math.round(bh * dpr));
    };

    /**
     * The grid. Still water leaves every dot where it is, faint. Where the water is raised or tilted, a dot is pushed along the slope,
     * grows and takes the brand colour. Returns how steep the steepest part of the water is.
     */
    const draw = (still: boolean): number => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, bw, bh);
      let top = 0;
      // Dots the water has not touched all share one colour, set once; only the few that are lit get their own.
      const rest = `rgba(${ink[0]},${ink[1]},${ink[2]},0.13)`;
      const restMajor = `rgba(${ink[0]},${ink[1]},${ink[2]},0.2)`;
      for (let j = 0; j * PITCH < bh + PITCH; j++) {
        for (let i = 0; i * PITCH < bw + PITCH; i++) {
          const x0 = i * PITCH + PITCH / 2;
          const y0 = j * PITCH + PITCH / 2;
          let x = x0;
          let y = y0;
          let lit = 0;
          if (!still) {
            const gx = Math.round(x0 / cell);
            const gy = Math.round(y0 / cell);
            if (gx > 0 && gy > 0 && gx < gw - 1 && gy < gh - 1) {
              const k = gy * gw + gx;
              const sx = cur[k + 1] - cur[k - 1];
              const sy = cur[k + gw] - cur[k - gw];
              const s = Math.hypot(sx, sy);
              if (s > top) top = s;
              x += Math.max(-5, Math.min(5, sx * 1.8));
              y += Math.max(-5, Math.min(5, sy * 1.8));
              lit = Math.min(1, Math.abs(cur[k]) * 0.18 + s * 0.12);
            }
          }
          const major = i % MAJOR === 0 && j % MAJOR === 0;
          if (lit < 0.03) {
            ctx.fillStyle = major ? restMajor : rest;
            if (major) {
              // A small crosshair: the grid's reference marks.
              ctx.fillRect(x - 3, y - 0.5, 6, 1);
              ctx.fillRect(x - 0.5, y - 3, 1, 6);
            } else ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
            continue;
          }
          const a = (major ? 0.2 : 0.13) * (1 - lit) + lit * 0.5;
          const c: Rgb = [ink[0] + (accent[0] - ink[0]) * lit, ink[1] + (accent[1] - ink[1]) * lit, ink[2] + (accent[2] - ink[2]) * lit];
          ctx.fillStyle = `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a.toFixed(3)})`;
          if (major) {
            const arm = 3 + lit * 2;
            ctx.fillRect(x - arm, y - 0.5, arm * 2, 1);
            ctx.fillRect(x - 0.5, y - arm, 1, arm * 2);
          } else {
            ctx.beginPath();
            ctx.arc(x, y, 0.9 + lit * 0.7, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      return top;
    };

    /** One step of the water: each cell moves toward the average of its four neighbours, carrying its own momentum. */
    const step = () => {
      for (let y = 1; y < gh - 1; y++) {
        for (let x = 1; x < gw - 1; x++) {
          const i = y * gw + x;
          prev[i] = ((cur[i - 1] + cur[i + 1] + cur[i - gw] + cur[i + gw]) * 0.5 - prev[i]) * DAMP;
        }
      }
      const t = cur;
      cur = prev;
      prev = t;
    };

    const tick = (now: number) => {
      owed += Math.min(0.05, (now - last) / 1000) * RATE; // steps owed, at a fixed rate whatever the screen's
      last = now;
      while (owed >= 1) {
        step();
        owed -= 1;
      }
      if (draw(false) < CALM) {
        // Still again: flatten the water, put the grid back as it was, and stop until the pointer is back.
        cur.fill(0);
        prev.fill(0);
        draw(true);
        running = false;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (running) return;
      running = true;
      last = performance.now();
      owed = 0;
      raf = requestAnimationFrame(tick);
    };

    /** A dip in the water at a place, in cells, `r` cells wide; the ripples are what the water does with it. */
    const drop = (gx: number, gy: number, amp: number, r = 3, spread = 3.2) => {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = Math.round(gx) + dx;
          const y = Math.round(gy) + dy;
          if (x < 1 || y < 1 || x >= gw - 1 || y >= gh - 1) continue;
          cur[y * gw + x] -= amp * Math.exp(-(dx * dx + dy * dy) / spread);
        }
      }
    };

    let at: { x: number; y: number } | null = null;
    const where = (e: PointerEvent) => {
      const r = box.getBoundingClientRect();
      return { ok: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom, x: (e.clientX - r.left) / cell, y: (e.clientY - r.top) / cell };
    };
    const point = (e: PointerEvent) => {
      const p = where(e);
      if (!p.ok) {
        at = null;
        return;
      }
      if (at) {
        // Along the path since the last event, a drop at every cell, bigger the faster the pointer went.
        const dist = Math.hypot(p.x - at.x, p.y - at.y);
        const power = 0.35 + Math.min(1, (dist * cell) / 45) * 0.65;
        const n = Math.max(1, Math.round(dist));
        for (let s = 1; s <= n; s++) drop(at.x + ((p.x - at.x) * s) / n, at.y + ((p.y - at.y) * s) / n, 1.5 * power);
        wake();
      }
      at = { x: p.x, y: p.y };
    };
    // A click is a splash: one big, wide drop.
    const splash = (e: PointerEvent) => {
      const p = where(e);
      if (!p.ok) return;
      drop(p.x, p.y, 8, 6, 14);
      wake();
    };
    const away = () => (at = null);

    fit();
    draw(true);
    const watch = new ResizeObserver(() => {
      fit();
      draw(true);
    });
    watch.observe(box);
    if (!canAnimate() || !playing) return () => watch.disconnect();

    window.addEventListener("pointermove", point, { passive: true });
    window.addEventListener("pointerdown", splash, { passive: true });
    window.addEventListener("pointerup", away);
    document.addEventListener("pointerleave", away);
    return () => {
      cancelAnimationFrame(raf);
      watch.disconnect();
      window.removeEventListener("pointermove", point);
      window.removeEventListener("pointerdown", splash);
      window.removeEventListener("pointerup", away);
      document.removeEventListener("pointerleave", away);
    };
  }, [ref, theme, playing]);

  return (
    <div ref={ref} className="livefield livefield--ripple" aria-hidden="true">
      <canvas ref={canvas} className="livefield__canvas" />
    </div>
  );
}
