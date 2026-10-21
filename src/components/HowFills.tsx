import { useState } from "react";
import { useApp } from "../app-context";
import { LIQUIDATION_RULE, ORDER_STEPS, fillSentence } from "../lib/protocol";
import { Modal } from "./ui";

/** A link that opens the fill rules in a dialog. Every order follows them, so they live behind a click instead of on the page. */
export function HowFills({ label = "How an order fills" }: { label?: string }) {
  const { snap } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="linklike" onClick={() => setOpen(true)} aria-haspopup="dialog">
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} wide title="How an order fills" sub="The same rules apply to every market.">
        <ol className="rules">
          {ORDER_STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="rules__n" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="rules__rule">
          <h3>{LIQUIDATION_RULE.title}</h3>
          <p>{LIQUIDATION_RULE.text}</p>
        </div>
        <p className="rules__fine">{fillSentence(snap?.pm.fence ?? 2)}</p>
      </Modal>
    </>
  );
}
