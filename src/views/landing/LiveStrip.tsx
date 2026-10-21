import { useApp } from "../../app-context";
import { Skeleton } from "../../components/Skeleton";
import { useNow } from "../../hooks/data";
import { FEED_DOT, feedView } from "../../lib/feed";
import { usdc } from "../../lib/format";

/**
 * What the chain says right now, in a row of figures under the first screen: whether the price feed is alive, what the vaults hold,
 * how many price updates and orders there have been. Every figure is read from the contracts. Until they are read the row holds
 * its place with a soft band, so the page does not jump when they arrive.
 */
export function LiveStrip() {
  const { snap, deployment } = useApp();
  const now = useNow(1000);
  if (!deployment) return null;
  const feed = feedView(snap, now);
  const updates = snap ? snap.markets.reduce((a, m) => a + m.count, 0) : 0;
  const orders = snap ? Math.max(0, Number(snap.pm.nextId) - 1) : 0;
  const items: { label: string; value: string; sub?: string; live?: boolean }[] = [
    { label: "Price feed", value: feed.label, sub: feed.age ? `${feed.age} ago` : undefined, live: true },
    { label: "In the vault", value: snap ? `${usdc(snap.vault.equity, 0)} tUSDC` : "" },
    { label: "Price updates posted", value: snap ? updates.toLocaleString("en-US") : "" },
    { label: "Orders placed", value: snap ? orders.toLocaleString("en-US") : "" },
  ];
  return (
    <section className="live" aria-label="Live on the chain">
      <dl className="live__in">
        {items.map((it) => (
          <div key={it.label} className="live__item">
            <dt>{it.label}</dt>
            <dd>
              {snap ? (
                <>
                  {it.live && <span className="live-dot" data-state={FEED_DOT[feed.state]} aria-hidden="true" />}
                  {it.value}
                </>
              ) : (
                <Skeleton w="6rem" h="1.75rem" />
              )}
            </dd>
            {/* Every item keeps this line, empty or not, so the strip does not grow when the feed's age arrives. */}
            <dd className="live__sub" aria-hidden={snap && it.sub ? undefined : true}>
              {snap && it.sub ? it.sub : "\u00a0"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
