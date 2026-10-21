import { ColorType, CrosshairMode, LineStyle, TickMarkType, type ChartOptions, type DeepPartial, type Time } from "lightweight-charts";
import { fullTime } from "../../lib/time";
import { rgba, type Palette } from "./palette";

/**
 * Basic keeps a chart to what it says: a line or bars, the last value, and a card that follows the pointer. Advanced hands over the
 * whole instrument: crosshair labels on both axes, the mouse wheel and drag to zoom and pan, a grid in both directions. A Basic chart
 * can still be made draggable (`interactive`): drag it to pan and drag either axis to stretch it, but the wheel is left to the page.
 */
export type ChartMode = "basic" | "advanced";

const clock = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const clockSeconds = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
const monthDay = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const month = new Intl.DateTimeFormat(undefined, { month: "short" });

/** An axis label in the reader's own zone. The library draws in UTC unless it is told otherwise. */
export function tickLabel(time: Time, type: TickMarkType): string {
  const d = new Date((time as number) * 1000);
  if (type === TickMarkType.Year) return String(d.getFullYear());
  if (type === TickMarkType.Month) return month.format(d);
  if (type === TickMarkType.DayOfMonth) return monthDay.format(d);
  // Zoomed in far enough that the minutes alone would repeat: the oracle's updates come a few seconds apart.
  if (type === TickMarkType.TimeWithSeconds) return clockSeconds.format(d);
  return clock.format(d);
}

export const crosshairTime = (time: Time): string => fullTime((time as number) * 1000);

/** Options shared by every chart in the app, from the palette in force. */
export function baseOptions(p: Palette, mode: ChartMode, edges: "fixed" | "free" = "fixed", interactive: boolean = mode === "advanced"): DeepPartial<ChartOptions> {
  const advanced = mode === "advanced";
  const dash = { color: p.line2, width: 1 as const, style: LineStyle.Dashed, labelBackgroundColor: p.ink };
  return {
    autoSize: true,
    layout: {
      background: { type: ColorType.Solid, color: "transparent" },
      textColor: p.muted,
      fontFamily: p.font,
      fontSize: 11,
      // The licence asks for a link to tradingview.com on the page: every page has it in its footer, so the logo is left off the plot.
      attributionLogo: false,
      panes: { separatorColor: p.line, separatorHoverColor: rgba(p.brand, 0.25), enableResize: advanced },
    },
    grid: {
      horzLines: { color: p.grid },
      vertLines: { color: rgba(p.grid, 0.55), visible: advanced },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: { ...dash, labelVisible: advanced },
      horzLine: { ...dash, visible: advanced, labelVisible: advanced },
    },
    // A label cut by the plot's edge is left out rather than half drawn.
    rightPriceScale: { borderVisible: false, entireTextOnly: true, scaleMargins: { top: 0.16, bottom: 0.12 } },
    timeScale: {
      borderVisible: false,
      timeVisible: true,
      secondsVisible: true,
      // A chart of what has happened ends at the edge of what has happened; a live one leaves room ahead of the newest candle.
      rightOffset: edges === "free" ? 6 : 0,
      fixLeftEdge: edges === "fixed",
      fixRightEdge: edges === "fixed",
      tickMarkFormatter: tickLabel,
    },
    localization: { timeFormatter: crosshairTime },
    // Dragging the plot pans it and dragging an axis stretches it (a double click on an axis puts it back). The wheel zooms only
    // where the chart is the whole instrument: on a Basic page it belongs to the page, which a wheel over the chart must not stop.
    handleScroll: interactive ? { mouseWheel: advanced, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false } : false,
    handleScale: interactive ? { mouseWheel: advanced, pinch: true, axisPressedMouseMove: true, axisDoubleClickReset: true } : false,
    kineticScroll: { mouse: false, touch: interactive },
  };
}
