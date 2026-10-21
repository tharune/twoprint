import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * A box that takes whatever height its parent leaves it and tells its child how tall that is, so a chart fills a panel that the
 * column beside it has made taller. With no spare height it keeps `min`, which is also what it keeps on a narrow screen where
 * the columns stack.
 */
export function Fill({ min = 240, children }: { min?: number; children: (height: number) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(min);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setHeight(Math.max(min, Math.floor(el.clientHeight)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [min]);
  return (
    <div ref={ref} className="fill" style={{ minHeight: min }}>
      <div className="fill__in">{children(height)}</div>
    </div>
  );
}
