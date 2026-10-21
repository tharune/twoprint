import { useEffect, useRef, useState } from "react";
import { useThemeName } from "../lib/theme";
import { localZone } from "../lib/time";

const SRC = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

/** A design token's current value, so the embedded chart is painted in the page's own surface and grid colours. */
const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/**
 * TradingView's Advanced Chart for a symbol. It is loaded only when the Advanced layout asks for it, and drawn again when the
 * theme changes. Its prices are an exchange's, not the oracle's, so the page says so beside it.
 */
export default function TradingViewChart({ symbol }: { symbol: string }) {
  const host = useRef<HTMLDivElement>(null);
  const theme = useThemeName();
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    setState("loading");
    el.replaceChildren();
    const watch = new MutationObserver(() => {
      if (el.querySelector("iframe")) {
        setState("ready");
        watch.disconnect();
      }
    });
    // The embed script reads its own element when it runs, so it is only added once this effect has settled. A symbol or theme
    // that changes again straight away never injects a script into a container that is about to be torn down.
    const inject = setTimeout(() => {
      const slot = document.createElement("div");
      slot.className = "tradingview-widget-container__widget";
      const script = document.createElement("script");
      script.src = SRC;
      script.async = true;
      script.textContent = JSON.stringify({
        autosize: true,
        symbol,
        interval: "5",
        timezone: localZone(),
        theme,
        style: "1",
        locale: "en",
        backgroundColor: token("--slip"),
        gridColor: token("--chart-grid"),
        allow_symbol_change: false,
        hide_volume: true,
        save_image: false,
        calendar: false,
        support_host: "https://www.tradingview.com",
      });
      script.onerror = () => setState("failed");
      el.append(slot, script);
      watch.observe(el, { childList: true, subtree: true });
    }, 60);
    // If no iframe arrives, the script was blocked or the network is out.
    const giveUp = setTimeout(() => {
      if (!el.querySelector("iframe")) setState("failed");
    }, 10_000);
    return () => {
      clearTimeout(inject);
      clearTimeout(giveUp);
      watch.disconnect();
      el.replaceChildren();
    };
  }, [symbol, theme]);

  return (
    <div className="tv">
      <div ref={host} className="tradingview-widget-container tv__host" />
      {state !== "ready" && (
        <p className="tv__state" role={state === "failed" ? "alert" : "status"}>
          {state === "failed" ? "The chart did not load. Check your connection or an ad blocker, or switch to the oracle chart." : "Loading the chart"}
        </p>
      )}
    </div>
  );
}
