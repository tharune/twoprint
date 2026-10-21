import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useApp } from "../app-context";
import { CLASSES, MARKET_DEFS, classOf, isLiveMarket, type AssetClass, type MarketDef } from "../config/markets";
import { compactUsd, movePct, px } from "../lib/format";
import { tickLabel } from "../lib/ticks";
import { useVenueStats, type VenueStat } from "../lib/venue";
import { IconChevronDown, IconClose, IconSearch } from "./icons";
import { Popover, Tabs } from "./ui";

type Scope = "all" | AssetClass;

/**
 * The market selector, in the manner of an exchange's: a button for the market you are on, and a panel with a search field, the
 * asset classes, and one line per market with its price, its move over 24 h and its volume. Markets the contracts carry come
 * first. One they do not carry yet is listed and marked, so the shape of the venue is visible, but it cannot be traded.
 */
export function MarketPicker() {
  const { selected, selectMarket } = useApp();
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <Popover
      label="Markets"
      align="left"
      panelClass="pop__panel--picker"
      trigger={({ open, toggle }) => (
        <button ref={trigger} type="button" className="mpick" onClick={toggle} aria-expanded={open} aria-haspopup="true" data-pop-trigger>
          <span className="mpick__sym">{selected.symbol}</span>
          <span className="mpick__name">{selected.name}</span>
          <IconChevronDown />
        </button>
      )}
    >
      {(close) => (
        <PickerPanel
          onPick={(id) => {
            selectMarket(id);
            close();
            requestAnimationFrame(() => trigger.current?.focus());
          }}
        />
      )}
    </Popover>
  );
}

/** What the list ranks by: the venue's 24 h volume, or the figure the registry was ranked by before the venue answers. */
const volumeOf = (d: MarketDef, stats: Record<string, VenueStat> | undefined) => stats?.[d.source]?.vol ?? d.liq.vol * 1e6;

function PickerPanel({ onPick }: { onPick: (id: string) => void }) {
  const { selected, snap } = useApp();
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const stats = useVenueStats().data;
  useEffect(() => search.current?.focus(), []);

  const term = q.trim().toLowerCase();
  const rows = useMemo(() => {
    const pool = MARKET_DEFS.filter((d) => scope === "all" || d.class === scope).filter(
      (d) => !term || `${d.symbol} ${d.name} ${d.id} ${classOf(d.class).label}`.toLowerCase().includes(term),
    );
    return [...pool].sort((a, b) => Number(isLiveMarket(b)) - Number(isLiveMarket(a)) || volumeOf(b, stats) - volumeOf(a, stats));
  }, [term, scope, stats]);

  const move = (dir: 1 | -1, from: Element | null) => {
    const items = [...(list.current?.querySelectorAll<HTMLButtonElement>(".picker__row") ?? [])];
    const i = from ? items.indexOf(from as HTMLButtonElement) : -1;
    items[Math.min(items.length - 1, Math.max(0, i + dir))]?.focus();
  };
  const onListKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (e.key === "ArrowUp" && list.current?.querySelector(".picker__row") === document.activeElement) search.current?.focus();
      else move(e.key === "ArrowDown" ? 1 : -1, document.activeElement);
    }
  };

  return (
    <div className="picker">
      <label className="picker__search">
        <IconSearch />
        <input
          ref={search}
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search markets"
          aria-label="Search markets"
          autoComplete="off"
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              move(1, null);
            } else if (e.key === "Enter" && rows[0]) onPick(rows[0].id);
          }}
        />
        {q && (
          <button type="button" className="picker__clear" onClick={() => (setQ(""), search.current?.focus())} aria-label="Clear the search">
            <IconClose />
          </button>
        )}
      </label>

      <div className="picker__tabs">
        <Tabs
          label="Asset class"
          idPrefix="picker"
          value={scope}
          onChange={setScope}
          tabs={[{ value: "all" as Scope, label: "All" }, ...CLASSES.map((c) => ({ value: c.id as Scope, label: c.label }))]}
        />
      </div>

      <div role="tabpanel" id={`picker-panel-${scope}`} aria-labelledby={`picker-tab-${scope}`}>
        <div className="picker__head" aria-hidden="true">
          <span>Market</span>
          <span>Price</span>
          <span>24h</span>
          <span className="picker__hide-sm">Volume</span>
          <span className="picker__hide-sm">Open interest</span>
        </div>
        <ul className="picker__list" ref={list} onKeyDown={onListKey} aria-label={term ? "Matching markets" : scope === "all" ? "All markets" : `${classOf(scope).label} markets`}>
          {rows.length === 0 && <li className="picker__none">No market matches &ldquo;{q.trim()}&rdquo;</li>}
          {rows.map((d) => {
            const live = isLiveMarket(d);
            const s = stats?.[d.source];
            const price = live ? snap?.markets[d.index!]?.latest?.oraclePx : undefined;
            const change = s?.change != null ? s.change * 10_000 : null;
            return (
              <li key={d.id}>
                <button type="button" className="picker__row" aria-current={d.id === selected.id ? "true" : undefined} onClick={() => onPick(d.id)}>
                  <span className="picker__id">
                    <b>{d.symbol}</b>
                    <span>{d.name}</span>
                    {!live && <em>Planned</em>}
                  </span>
                  <span className="picker__px">{live ? (price !== undefined ? px(price, d.index!) : "–") : s ? tickLabel(s.px, d.dp) : "–"}</span>
                  <span className={`picker__chg${change === null ? "" : change >= 0.5 ? " is-up" : change <= -0.5 ? " is-down" : ""}`}>{change === null ? "–" : movePct(change)}</span>
                  <span className="picker__hide-sm">{s ? compactUsd(s.vol) : "–"}</span>
                  <span className="picker__hide-sm">{s ? compactUsd(s.oi) : "–"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
