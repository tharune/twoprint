import { useState } from "react";
import { useApp } from "../app-context";
import { stateOf, type PositionRecord } from "../hooks/data";
import { useTx } from "../hooks/tx";
import { commitCloseRequest, settleRequest } from "../lib/protocol";
import { AddMarginDialog } from "./AddMargin";
import { Button } from "./ui";

export function SettleButton({ id, highlight, small }: { id: bigint; highlight?: boolean; small?: boolean }) {
  const { chainId, deployment: d } = useApp();
  const { run, busy, blocked } = useTx(chainId);
  return (
    <Button
      size={small ? "sm" : "md"}
      variant={highlight ? "primary" : "secondary"}
      disabled={!!blocked || !!busy || !d}
      busy={busy === `Settle #${id}`}
      title={blocked ?? "Anyone can do this. It moves the order along as the price record says: filling it, cancelling it, liquidating it or closing it."}
      onClick={() => d && run(`Settle #${id}`, settleRequest(d, id))}
    >
      Settle
    </Button>
  );
}

type Action = "addCollateral" | "close" | "settle";

/**
 * What can be done to a live order: its owner can add collateral or close it, and anyone can settle it. A list row offers fewer of
 * them (`show`), so its buttons are a short row and the full set is one click away in the order's dialog.
 */
export function OrderActions({ p, mine, small, show = ["addCollateral", "close", "settle"] }: { p: PositionRecord; mine: boolean; small?: boolean; show?: Action[] }) {
  const { chainId, deployment: d } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const { run, busy, blocked } = useTx(chainId);
  const st = stateOf(p);
  const marginBusy = (p.marginPending ?? 0n) > 0n;
  const size = small ? "sm" : "md";
  const owner = mine && st === "Open";

  return (
    <div className="actions">
      {owner && show.includes("addCollateral") && (
        <Button
          size={size}
          variant="secondary"
          disabled={!!blocked || !!busy || !d || marginBusy}
          title={marginBusy ? "An addition is already pending" : "Add collateral to move your liquidation price away"}
          onClick={() => setAddOpen(true)}
        >
          Add collateral
        </Button>
      )}
      {owner && show.includes("close") && (
        <Button
          size={size}
          disabled={!!blocked || !!busy || !d || marginBusy}
          busy={busy === `Close #${p.id}`}
          title={marginBusy ? "You can't close while added collateral is pending" : "Exits at the worse of the oracle and book price, on the second price update after you click or, if that one is stamped under 1 s after your click, on the first later one stamped at least 1 s after your click. If the exit update is stamped more than 120 s after your click, or none arrives within 150 s, the close is cancelled and the position stays open."}
          onClick={() => d && run(`Close #${p.id}`, commitCloseRequest(d, p.id))}
        >
          Close
        </Button>
      )}
      {show.includes("settle") && <SettleButton id={p.id} small={small} />}
      {owner && <AddMarginDialog p={p} open={addOpen} onClose={() => setAddOpen(false)} />}
    </div>
  );
}
