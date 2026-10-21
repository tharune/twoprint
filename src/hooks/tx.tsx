import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { BaseError, ContractFunctionRevertedError, hexToString, type Abi, type Address, type Hex, type PublicClient } from "viem";
import { DEPLOYMENTS, type ChainId } from "../config/chains";
import { DEV } from "../config/dev";
import { DEV_CONNECTOR_ID } from "../wagmi";

export interface TxToast {
  id: number;
  label: string;
  status: "signing" | "pending" | "ok" | "fail";
  hash?: Hex;
  chainId: number;
  error?: string;
}

const Ctx = createContext<{ toasts: TxToast[]; push: (t: TxToast) => void; dismiss: (id: number) => void } | null>(null);

export function TxProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<TxToast[]>([]);
  const push = useCallback((t: TxToast) => {
    setToasts((xs) => {
      const rest = xs.filter((x) => x.id !== t.id);
      return [...rest, t].slice(-5);
    });
    if (t.status === "ok") setTimeout(() => setToasts((xs) => xs.filter((x) => x.id !== t.id)), 6000);
  }, []);
  const dismiss = useCallback((id: number) => setToasts((xs) => xs.filter((x) => x.id !== id)), []);
  return <Ctx.Provider value={{ toasts, push, dismiss }}>{children}</Ctx.Provider>;
}
export const useToasts = () => useContext(Ctx)!;

const fmt6 = (v: unknown) => (typeof v === "bigint" ? (Number(v) / 1e6).toFixed(2) : String(v));

/** Plain-English reasons for the protocol's custom errors. */
function explain(name: string, args: readonly unknown[] | undefined): string {
  const a = args ?? [];
  switch (name) {
    case "StaleFeed":
      return "Prices for this market have stopped updating, so new trades are paused until they resume.";
    case "PremiumAboveMax":
      return `The premium rose to ${fmt6(a[0])} tUSDC, above your limit of ${fmt6(a[1])}, because volatility moved. Check the new quote and open again.`;
    case "MarginTooThin":
      return `After the reserved premium, your margin would be ${a[1] ? (Number(((a[0] as bigint) * 100_000n) / (a[1] as bigint)) / 1000).toFixed(2) : "?"}% of the position size, which is too thin to cover a fill up to 0.15% worse than the current price. The premium grows with volatility, so at high leverage a fast market can price an open out. Lower the leverage, add collateral, or wait for volatility to ease.`;
    case "NotExpired":
      return "Not expired yet: a pending order can be cancelled only 150 s after you placed it, and only if no price update has qualified to fill it.";
    case "NothingClaimable":
      return "Nothing to withdraw.";
    case "BlackoutWindow":
      return "Blackout window: above 100x, new trades are paused in the weekday windows around 12:30 and 13:30 UTC (see the ticket).";
    case "BadLeverage":
      return `Leverage ${a[0]}x is above your tier's cap (${a[1]}x).`;
    case "CloseOnly":
      return "New trades are paused (by the operator, because the vault hit its daily loss limit, or while the vault owes winners). You can still close.";
    case "CapExceeded": {
      const which = typeof a[0] === "string" ? hexToString(a[0] as Hex).replace(/\0/g, "") : "?";
      return `The limit on open positions has been reached (${which}).`;
    }
    case "PremiumExceedsCollateral":
      return "The premium would use up all of your collateral at this leverage. Lower the leverage.";
    case "BadCollateral":
      return "Collateral is below the minimum.";
    case "NotionalTooLarge":
      return "That position is above the maximum size.";
    case "NoPrints":
      return "This market has no price updates yet.";
    case "NotTrader":
      return "Only the position's trader can do that.";
    case "BadState":
      return "The position isn't in a state that allows this.";
    case "FillAvailable":
      return "A price update that can fill this order already exists. Settle it instead: it fills or cancels, as the price record says.";
    case "ERC20InsufficientAllowance":
      return "Approve tUSDC first.";
    case "ERC20InsufficientBalance":
      return "Not enough tUSDC. Get free test tUSDC from the ticket.";
    default:
      return name;
  }
}

function describeError(e: unknown): string {
  if (e instanceof BaseError) {
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
    if (revert?.data?.errorName) return explain(revert.data.errorName, revert.data.args);
    if (revert?.reason) return revert.reason;
    return e.shortMessage;
  }
  return (e as Error)?.message ?? String(e);
}

let nextToast = 1;

/**
 * The receipt of a transaction that is already sent. viem's waitForTransactionReceipt rejects on the first poll that fails for
 * any reason but "not found yet" (a throttled read included), though the transaction may well be mined: ask again until the
 * deadline, and only then give up (a real timeout still fails).
 */
export async function waitMined(client: PublicClient, hash: Hex, ms = 120_000) {
  const deadline = Date.now() + ms;
  for (;;) {
    try {
      return await client.waitForTransactionReceipt({ hash, pollingInterval: 300, timeout: Math.max(1_000, deadline - Date.now()) });
    } catch (e) {
      if ((e as Error).name === "WaitForTransactionReceiptTimeoutError" || Date.now() >= deadline) throw e;
      await new Promise((r) => setTimeout(r, 1_000));
    }
  }
}

/** simulate (to surface the revert reason) -> sign/send -> wait for the receipt. */
export function useTx(chainId: ChainId) {
  const { address, connector, chainId: walletChain } = useAccount();
  const client = usePublicClient({ chainId }) as PublicClient | undefined;
  const { writeContractAsync } = useWriteContract();
  const { push } = useToasts();
  const [busy, setBusy] = useState<string | null>(null);

  const blocked: string | null = !DEPLOYMENTS[chainId]
    ? "Not deployed on this chain yet: writes are disabled."
    : !address
      ? "Connect a wallet to sign."
      : walletChain !== chainId
        ? "Your wallet is on another chain."
        : DEV && connector?.id === DEV_CONNECTOR_ID && chainId !== 31337
          ? "The anvil dev account only signs on local anvil."
          : null;

  const run = useCallback(
    async (label: string, req: { address: Address; abi: Abi; functionName: string; args?: readonly unknown[] }) => {
      if (blocked || !client || !address) throw new Error(blocked ?? "not ready");
      const id = nextToast++;
      setBusy(label);
      push({ id, label, status: "signing", chainId });
      let sent: Hex | undefined;
      try {
        await client.simulateContract({ ...req, account: address } as never);
        // Gas depends on state (stress library, print scans), and a price post can land between the estimate and
        // inclusion: an exact estimate then runs out of gas. Send the estimate + 30%.
        const est = await client.estimateContractGas({ ...req, account: address } as never);
        const hash = await writeContractAsync({ ...req, chainId, gas: (est * 13n) / 10n } as never);
        sent = hash;
        push({ id, label, status: "pending", hash, chainId });
        const r = await waitMined(client, hash);
        if (r.status !== "success") throw new Error("reverted on-chain");
        push({ id, label, status: "ok", hash, chainId });
        return r;
      } catch (e) {
        // once the wallet returned a hash the transaction is out there: say "unconfirmed", never "failed", unless it reverted
        const unconfirmed = sent && !(e instanceof Error && e.message === "reverted on-chain");
        push({ id, label, status: "fail", hash: sent, chainId, error: unconfirmed ? `Sent but not confirmed (${describeError(e)}). It may still have gone through: check the explorer link before sending it again.` : describeError(e) });
        return null;
      } finally {
        setBusy(null);
      }
    },
    [blocked, client, address, chainId, writeContractAsync, push],
  );

  return { run, busy, blocked, address };
}
