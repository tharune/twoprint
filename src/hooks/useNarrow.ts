import { useEffect, useState } from "react";

/** Whether the window is narrower than `px`, kept current. Layout that CSS cannot decide, such as a chart's height, reads it. */
export function useNarrow(px = 640): boolean {
  const query = `(max-width: ${px}px)`;
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setNarrow(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return narrow;
}
