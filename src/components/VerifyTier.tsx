import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { tierRegistryAbi } from "../abi/generated";
import { useApp } from "../app-context";
import { IS_LOCAL_HOST } from "../config/chains";
import { DEV } from "../config/dev";
import { TIER } from "../hooks/data";
import { useTx } from "../hooks/tx";
import { short } from "../lib/format";
import { Badge, Button, Modal, Notice, Receipt, ReceiptRow } from "./ui";

/** The optional attester endpoint. Override at build time with VITE_ATTESTER_URL; only the dev server falls back to the local one. */
const ATTESTER_URL: string = ((import.meta.env.VITE_ATTESTER_URL as string | undefined) || (DEV ? "http://127.0.0.1:8790" : "")).replace(/\/+$/, "");

/**
 * Verification needs a reachable attester: the local one on anvil (31337), or one whose URL this build was given
 * (VITE_ATTESTER_URL). A hosted build without it would probe the visitor's own 127.0.0.1, so it offers no verification.
 */
export const verifyAvailable = (chainId: number): boolean => (DEV && chainId === 31337) || !!import.meta.env.VITE_ATTESTER_URL;

interface Health {
  chainId: number;
  tierRegistry: string | null;
  attesting: boolean;
  rules: { minAgeDays: number; minFeesUsd: number };
}

interface Eligibility {
  address: string;
  tier: "Default" | "Verified" | "Flagged";
  tierId: number;
  firstFillAt: string | null;
  feesUsd: number;
  fillCount: number;
  reasons: string[];
  evidence: { complete: boolean };
}

async function attester<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${ATTESTER_URL}${path}`, { ...init, signal: AbortSignal.timeout(25_000) });
  const body = (await r.json().catch(() => ({}))) as { message?: string };
  if (!r.ok) throw new Error(body.message ?? `The attester answered HTTP ${r.status}.`);
  return body as T;
}

type Phase = { s: "idle" } | { s: "checking" } | { s: "done"; e: Eligibility } | { s: "error"; message: string };

export function VerifyTier({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { chainId, deployment, snap } = useApp();
  const { address } = useAccount();
  const { run, busy, blocked } = useTx(chainId);
  const [health, setHealth] = useState<Health | "down" | null>(null);
  const [phase, setPhase] = useState<Phase>({ s: "idle" });
  const [recording, setRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  const probe = useCallback(() => {
    setHealth(null);
    attester<Health>("/health").then(setHealth, () => setHealth("down"));
  }, []);

  useEffect(() => {
    if (!open) return;
    setPhase({ s: "idle" });
    setRecordError(null);
    probe();
  }, [open, probe]);

  const currentTier = snap?.user ? TIER[snap.user.tier] : undefined;
  const registryMismatch =
    health && health !== "down" && deployment && health.tierRegistry && health.tierRegistry.toLowerCase() !== deployment.TierRegistry.toLowerCase();

  const check = async () => {
    if (!address) return;
    setPhase({ s: "checking" });
    try {
      setPhase({ s: "done", e: await attester<Eligibility>(`/eligibility?address=${address}`) });
    } catch (e) {
      setPhase({ s: "error", message: (e as Error).message });
    }
  };

  const record = async () => {
    if (!address || !deployment) return;
    setRecording(true);
    setRecordError(null);
    try {
      const a = await attester<{ setTierArgs: [string, number, number | string, number | string, `0x${string}`] }>("/attest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const [account, tierId, expiry, nonce, signature] = a.setTierArgs;
      const receipt = await run("Record verified tier", {
        address: deployment.TierRegistry,
        abi: tierRegistryAbi,
        functionName: "setTier",
        args: [account, Number(tierId), BigInt(expiry), BigInt(nonce), signature],
      });
      if (receipt) onClose();
    } catch (e) {
      setRecordError((e as Error).message);
    } finally {
      setRecording(false);
    }
  };

  const rules = health && health !== "down" ? health.rules : undefined;
  const result = phase.s === "done" ? phase.e : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Verify your Hyperliquid history"
      sub={`Verified accounts can open positions ${snap ? `up to ${snap.pm.maxLevVerified}x, against ${snap.pm.maxLevDefault}x for everyone else` : "at a higher leverage cap"}. We read public Hyperliquid fills for your address. This is not KYC, and we never see a key.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {result?.tierId === 1 && currentTier !== "Verified" ? (
            <Button onClick={record} busy={recording || !!busy} disabled={!!blocked || !!registryMismatch}>
              Record on-chain
            </Button>
          ) : (
            <Button onClick={check} busy={phase.s === "checking"} disabled={!address || health === "down" || health === null}>
              {result ? "Check again" : "Check eligibility"}
            </Button>
          )}
        </>
      }
    >
      <Receipt label="Account">
        <ReceiptRow label="Address">{address ? short(address) : "Not connected"}</ReceiptRow>
        <ReceiptRow label="Current tier">{currentTier ?? "–"}</ReceiptRow>
        {rules && (
          <ReceiptRow label="Needed for Verified" note="Counted from public Hyperliquid fills, net of maker rebates.">
            {rules.minAgeDays} days of history and ${rules.minFeesUsd} in fees
          </ReceiptRow>
        )}
      </Receipt>

      {health === "down" && (
        <Notice
          tone="warn"
          title="Verification is unavailable right now"
          actions={
            <Button size="sm" variant="secondary" onClick={probe}>
              Try again
            </Button>
          }
        >
          {IS_LOCAL_HOST ? (
            <>
              Expected at {ATTESTER_URL}. Configure a reachable endpoint using <code>VITE_ATTESTER_URL</code> when building the app.
            </>
          ) : (
            "Try again in a moment."
          )}
        </Notice>
      )}
      {registryMismatch && <Notice tone="warn">{IS_LOCAL_HOST ? "This attester signs for a different TierRegistry than the one this app uses, so its attestation would be rejected." : "Verification is unavailable right now. Try again in a moment."}</Notice>}
      {health && health !== "down" && !health.attesting && <Notice tone="warn">{IS_LOCAL_HOST ? "The attester can read history but has no signing key configured, so it cannot issue an attestation." : "Verification is unavailable right now. Try again in a moment."}</Notice>}
      {phase.s === "error" && (
        <Notice tone="error" title="Could not check this address">
          {phase.message}
        </Notice>
      )}
      {recordError && (
        <Notice tone="error" title="Could not record the tier">
          {recordError}
        </Notice>
      )}

      {result && (
        <Receipt label="Eligibility result">
          <ReceiptRow label="First fill">{result.firstFillAt ? new Date(result.firstFillAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "None found"}</ReceiptRow>
          <ReceiptRow label="Fees paid">${result.feesUsd.toFixed(2)}</ReceiptRow>
          <ReceiptRow label="Fills read">
            {result.fillCount.toLocaleString()}
            {!result.evidence.complete && " or more"}
          </ReceiptRow>
          <ReceiptRow label="Result" total>
            <Badge tone={result.tierId === 1 ? "carbon" : result.tierId === 2 ? "warn" : "neutral"}>{result.tier}</Badge>
          </ReceiptRow>
        </Receipt>
      )}
      {result && result.reasons.length > 0 && (
        <ul className="reasons">
          {result.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      {result?.tierId === 1 && currentTier === "Verified" && <Notice tone="success">This account is already verified on-chain.</Notice>}
      {blocked && result?.tierId === 1 && <Notice tone="warn">{blocked}</Notice>}
    </Modal>
  );
}
