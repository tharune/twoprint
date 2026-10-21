import { useToasts } from "../hooks/tx";
import { IconCircleCheck, IconCircleX, IconClose } from "./icons";
import { TxLink } from "./ui";

const DETAIL = { signing: "Waiting for your signature", pending: "Confirming on-chain", ok: "Confirmed", fail: "Failed" } as const;

export function Toasts() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="toasts" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.status}`} role={t.status === "fail" ? "alert" : "status"}>
          <span className="toast__mark">
            {t.status === "ok" ? <IconCircleCheck /> : t.status === "fail" ? <IconCircleX /> : <span className="spinner" aria-hidden="true" />}
          </span>
          <div>
            <div className="toast__title">{t.label}</div>
            <div className="toast__detail">
              {t.status === "fail" && t.error ? t.error : DETAIL[t.status]} <TxLink chainId={t.chainId} hash={t.hash} />
            </div>
          </div>
          <button type="button" className="toast__close icon-btn" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <IconClose />
          </button>
        </div>
      ))}
    </div>
  );
}
