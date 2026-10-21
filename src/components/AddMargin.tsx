import { useState } from "react";
import { maxUint256 } from "viem";
import { testUSDCAbi } from "../abi/generated";
import { useApp } from "../app-context";
import type { PositionRecord } from "../hooks/data";
import { useTx } from "../hooks/tx";
import { MARKETS, diffBp, parseUsdc, pct, px, usdc } from "../lib/format";
import { liqPrice } from "../lib/math";
import { commitAddMarginRequest } from "../lib/protocol";
import { levelNow } from "../lib/receipt";
import { Button, Chips, Field, Input, Modal, Notice, Receipt, ReceiptRow } from "./ui";

const PRESETS = ["5", "10", "25", "50", "100"];

export function AddMarginDialog({ p, open, onClose }: { p: PositionRecord; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={`Add collateral to order #${p.id}`} sub={`${p.isLong ? "Long" : "Short"} ${MARKETS[p.market]} ${p.leverage}x. More collateral moves your liquidation price further from the current price.`}>
      <Body p={p} onClose={onClose} />
    </Modal>
  );
}

function Body({ p, onClose }: { p: PositionRecord; onClose: () => void }) {
  const { chainId, deployment: d, snap } = useApp();
  const { run, busy, blocked } = useTx(chainId);
  const [amount, setAmount] = useState("10");
  const add = parseUsdc(amount);
  const u = snap?.user;
  const needsApprove = !!u && add !== null && u.allowance < add;

  const margin = p.collateral - p.premium;
  const newMargin = margin + (add ?? 0n);
  const newLiq = p.fill ? liqPrice(p.fill.fillPx, newMargin, p.notional, p.isLong) : null;
  const curLiq = levelNow(p);

  let error: string | null = null;
  if (add === null || add <= 0n) error = "Enter an amount in tUSDC, up to 6 decimals.";
  else if (u && u.usdc < add) error = "That is more than your balance.";

  const approve = () => d && run("Approve tUSDC", { address: d.TestUSDC, abi: testUSDCAbi, functionName: "approve", args: [d.PositionManager, maxUint256] });
  const commit = async () => {
    if (!d || add === null || add <= 0n) return;
    const r = await run(`Add ${usdc(add)} tUSDC to #${p.id}`, commitAddMarginRequest(d, p.id, add));
    if (r) onClose();
  };

  return (
    <>
      <Field as="label" label="Additional collateral" aside={u ? <>Balance <strong>{usdc(u.usdc)}</strong> tUSDC</> : undefined}>
        <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} unit="tUSDC" invalid={error !== null} autoFocus autoComplete="off" aria-label="Additional collateral in tUSDC" />
      </Field>
      <div>
        <Chips label="Amount presets" options={PRESETS} value={amount} onChange={setAmount} format={(a) => `+${a}`} />
        {error && <p className="ticket__error">{error}</p>}
      </div>

      {newLiq !== null && curLiq !== undefined && add !== null && add > 0n && (
        <Receipt label="Effect of adding collateral">
          <ReceiptRow label="Collateral">
            {usdc(p.collateral)} to {usdc(p.collateral + add)} tUSDC
          </ReceiptRow>
          <ReceiptRow label="Liquidation price" tone="long" note={`${pct(Math.abs(diffBp(newLiq, curLiq)) / 100, 2)} ${p.isLong ? "lower" : "higher"} than now`}>
            {px(curLiq, p.market)} to {px(newLiq, p.market)}
          </ReceiptRow>
        </Receipt>
      )}

      <Notice>
        Takes effect on price update {snap?.pm.fence ?? 2} after you confirm or, if that one is stamped under 1 s after you confirm, on the first later one stamped at least 1 s after your confirm (the stamp is the price signer’s clock). Until then your old liquidation price applies: if two price updates in a row cross it first, you are liquidated and the collateral you added is refunded in full.
      </Notice>
      {blocked && <Notice tone="warn">{blocked}</Notice>}

      <div className="modal__foot">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        {needsApprove ? (
          <Button onClick={approve} busy={busy === "Approve tUSDC"} disabled={!!blocked || !!busy || !d}>
            Approve tUSDC
          </Button>
        ) : (
          <Button onClick={commit} busy={!!busy?.startsWith("Add ")} disabled={!!blocked || !!busy || !d || error !== null}>
            Add collateral
          </Button>
        )}
      </div>
    </>
  );
}
