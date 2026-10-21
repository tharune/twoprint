import { useApp } from "../app-context";
import { stateOf } from "../hooks/data";
import { MARKETS, short, usdc } from "../lib/format";
import { OrderActions } from "./OrderActions";
import { ORDER_STATUS, OrderDetails } from "./PositionCard";
import { Badge, Modal, SideBadge } from "./ui";

/**
 * One order, from commit to close, in a dialog. It opens when an order is committed and when a row in a list is picked, and the
 * oracle chart keeps following the order after it is closed.
 */
export function OrderModal() {
  const { orderOpen, closeOrder, focus: p, address } = useApp();
  const mine = !!p && !!address && p.trader.toLowerCase() === address.toLowerCase();
  const st = p ? stateOf(p) : "None";
  return (
    <Modal
      open={orderOpen && !!p}
      onClose={closeOrder}
      wide
      name="Order"
      title={
        p ? (
          <span className="inline-gap">
            <SideBadge isLong={p.isLong} />
            {MARKETS[p.market]} {p.leverage.toString()}x
          </span>
        ) : (
          "Order"
        )
      }
      sub={p ? `${usdc(p.collateral)} tUSDC collateral, order #${p.id.toString()}${mine ? "" : `, ${short(p.trader)}`}` : undefined}
    >
      {p && (
        <>
          <div className="odetail__bar">
            <Badge tone={ORDER_STATUS[st].tone} dot>
              {ORDER_STATUS[st].label}
            </Badge>
            {(st === "Open" || st === "PendingClose") && <OrderActions p={p} mine={mine} small />}
          </div>
          <OrderDetails key={p.id.toString()} p={p} />
        </>
      )}
    </Modal>
  );
}
