import { useState } from "react";
import { useApp } from "../app-context";
import { devControl } from "../hooks/data";
import { MARKETS } from "../lib/format";
import { Button, Disclosure, Notice } from "./ui";

/** Add ?bench to the address to see it. */
const wanted = () => new URLSearchParams(window.location.search).has("bench");

/** Local node only, and only on request. Drives the dev price script's synthetic moves so a test can show a wick, a liquidation or an outage on cue. */
export function DevBench() {
  const { dev, market } = useApp();
  const [msg, setMsg] = useState<string | null>(null);
  const name = MARKETS[market];
  const go = async (path: string, label: string) => {
    try {
      await devControl(path);
      setMsg(`${label} is queued. It applies from the next post, in about 3 s.`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  };
  if (dev === undefined || !wanted()) return null;

  return (
    <section className="bench" aria-label="Local node tools">
      <Disclosure summary="Local node tools">
        <div className="bench__body">
          {dev === null ? (
            <Notice>
              The optional local price service is not reachable on 127.0.0.1:8548.
            </Notice>
          ) : (
            <>
              <p className="bench__status">
                Prices come from {dev.source === "hl" ? "the Hyperliquid websocket (oracle price and book mid)" : "a random walk"}, posted every {(dev.intervalMs / 1000).toFixed(0)} s. Post sequence {dev.lastSeq}.
                {Object.values(dev.queued).some((q) => q > 0) && ` Synthetic posts queued: ${Object.entries(dev.queued).map(([m, q]) => `${m} ${q}`).join(", ")}.`}
                {!!dev.pausedSec && ` Outage: not posting for ${dev.pausedSec} s more.`}
              </p>
              <div className="bench__grid">
                <Button size="sm" variant="secondary" onClick={() => go(`/drop?market=${name}&bp=150`, `${name} two-print drop`)} title="Two consecutive prints 150 and 162 bp below, past a fresh 100x long's level.">
                  {name} two-print drop, −150 bp
                </Button>
                <Button size="sm" variant="secondary" onClick={() => go(`/drop?market=${name}&bp=150&dir=up`, `${name} two-print pump`)} title="Two consecutive prints 150 and 162 bp above, past a fresh 100x short's level.">
                  {name} two-print pump, +150 bp
                </Button>
                <Button size="sm" variant="secondary" onClick={() => go(`/wick?market=${name}&bp=150`, `${name} single-print wick`)} title="One print 150 bp below, then straight back. A 100x long pays its premium but survives.">
                  {name} one-print wick, −150 bp
                </Button>
                <Button size="sm" variant="secondary" onClick={() => go(`/pause?sec=130`, "The feed outage")} title="Stops posting for 130 s. The feed goes stale, and a commit just before it voids because the fill print comes more than 120 s later.">
                  Feed outage, 130 s
                </Button>
                <Button size="sm" variant="secondary" onClick={() => go(`/shift?market=${name}&bp=40&hold=20`, `${name} +40 bp shift`)}>
                  {name} +40 bp for 20 posts
                </Button>
                <Button size="sm" variant="secondary" onClick={() => go(`/shift?market=${name}&bp=-40&hold=20`, `${name} −40 bp shift`)}>
                  {name} −40 bp for 20 posts
                </Button>
              </div>
              {msg && <p className="bench__msg" role="status">{msg}</p>}
              <p className="bench__fine">These moves are synthetic and labelled as such across the app.</p>
            </>
          )}
        </div>
      </Disclosure>
    </section>
  );
}
