import { useLayoutEffect, useState, type RefObject } from "react";

/** An element's width, kept current as it resizes. The SVG charts draw at this width, so their text is never scaled. */
export function useWidth(ref: RefObject<HTMLElement | null>, { initial = 720, min = 280 }: { initial?: number; min?: number } = {}) {
  const [w, setW] = useState(initial);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.max(min, Math.floor(el.clientWidth)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, min]);
  return w;
}
