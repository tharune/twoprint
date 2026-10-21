import { useApp } from "../app-context";
import { DEPLOYED_MARKETS, classOf, liveMarkets } from "../config/markets";
import { Badge, Button } from "./ui";

/** Stands where the ticket would be for a market the contracts do not carry yet. */
export function NotLive() {
  const { selected, selectMarket } = useApp();
  const vault = classOf(selected.class).vault;
  return (
    <section className="notlive" aria-label={`${selected.name} is not open for orders`}>
      <Badge>Planned</Badge>
      <h2 className="notlive__title">{selected.name} is not open for orders yet</h2>
      <p>
        {selected.symbol} would trade against the {vault.toLowerCase()}, which is not deployed yet. Only the crypto vault is live.
      </p>
      <div className="notlive__alts">
        {liveMarkets(DEPLOYED_MARKETS).map((d) => (
          <Button key={d.id} variant="secondary" onClick={() => selectMarket(d.id)}>
            Trade {d.symbol}
          </Button>
        ))}
      </div>
    </section>
  );
}
