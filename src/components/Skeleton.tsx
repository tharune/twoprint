import type { CSSProperties } from "react";

/** A soft band where something will be, for the moments before it is read. */
export function Skeleton({ w, h = "0.875rem", className }: { w?: string | number; h?: string | number; className?: string }) {
  const style: CSSProperties = { width: w, height: h };
  return <span className={className ? `sk ${className}` : "sk"} style={style} aria-hidden="true" />;
}

/**
 * What a screen reader hears for a placeholder: "Loading", once. A page of several placeholders says it on the page and keeps
 * its parts quiet (`quiet`), so there are not a handful of regions with the same name.
 */
const announced = (quiet?: boolean) => (quiet ? ({ "aria-hidden": true } as const) : ({ role: "status", "aria-label": "Loading" } as const));

/** A strip of figures waiting to be filled in. */
export function SkeletonStrip({ n = 4, quiet }: { n?: number; quiet?: boolean }) {
  return (
    <div className="readings sk-strip" {...announced(quiet)}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="stat">
          <Skeleton w="45%" h="0.75rem" />
          <Skeleton w="70%" h="1.5rem" />
          <Skeleton w="55%" h="0.625rem" />
        </div>
      ))}
    </div>
  );
}

/** A few lines where a list or some figures will be, inside a panel that is already drawn. */
export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="sk-list" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} w={i % 2 ? "82%" : "100%"} h="1.125rem" />
      ))}
    </div>
  );
}

/** A panel waiting for its chart or its rows. */
export function SkeletonPanel({ title = true, rows = 0, chart = false, quiet }: { title?: boolean; rows?: number; chart?: boolean; quiet?: boolean }) {
  return (
    <div className="panel sk-panel" {...announced(quiet)}>
      {title && (
        <header className="sk-panel__head">
          <Skeleton w="9rem" h="1.125rem" />
          <Skeleton w="16rem" h="0.75rem" />
        </header>
      )}
      {chart && <span className="sk sk--chart" aria-hidden="true" />}
      {rows > 0 && (
        <div className="sk-panel__rows">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="sk-row">
              <Skeleton w="22%" h="0.875rem" />
              <Skeleton w="12%" h="0.875rem" />
              <Skeleton w="16%" h="0.875rem" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** What a page shows while its first read is on the way: a strip and two panels where they will be. */
export function PageLoading({ strip = 4 }: { strip?: number }) {
  return (
    <div className="stackp" role="status" aria-label="Loading" aria-busy="true">
      <SkeletonStrip n={strip} quiet />
      <div className="cols2">
        <SkeletonPanel chart quiet />
        <SkeletonPanel rows={4} quiet />
      </div>
    </div>
  );
}
