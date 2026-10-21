import { useState } from "react";
import { TransactionNotFoundError, TransactionReceiptNotFoundError, isHash } from "viem";
import { useBlockNumber, usePublicClient } from "wagmi";
import { useApp } from "../app-context";
import { Badge, Button, Field, Input, Notice, Receipt, ReceiptRow, Stat, TxLink } from "../components/ui";
import { CHAIN_LABEL } from "../config/chains";
import { short, usdc } from "../lib/format";

interface Diagnosis {
  id: string;
  label: string;
  symptom: string;
  why: string;
  testnet: string;
  mainnet: string;
  action: string;
}

const DIAGNOSES: Diagnosis[] = [
  {
    id: "deposit",
    label: "A deposit has not arrived",
    symptom: "USDC left HyperEVM but has not shown up in your Elysium wallet.",
    why: "A deposit from the parent chain creates a retryable ticket on Elysium, which normally redeems itself. If auto-redemption fails, for example when gas spikes, the ticket waits for someone to redeem it by hand.",
    testnet: "About a minute. Retryables took 67 to 76 s in our measurements.",
    mainnet: "The same order of magnitude. A ticket that failed to redeem stays redeemable for 7 days.",
    action: "Anyone can redeem it: call redeem(ticketId) on the ArbRetryableTx precompile at 0x000…006E on Elysium.",
  },
  {
    id: "waiting",
    label: "A withdrawal is waiting",
    symptom: "You started a withdrawal from Elysium to HyperEVM and cannot claim it yet.",
    why: "Elysium is an optimistic rollup. A withdrawal can only be claimed on the parent chain once the challenge period has passed.",
    testnet: "10 blocks on the testnet.",
    mainnet: "Not published yet. Arbitrum's default is about 7 days.",
    action: "Wait. There is nothing to do until the period ends.",
  },
  {
    id: "claim",
    label: "A withdrawal is ready but unclaimed",
    symptom: "The challenge period is over, but the funds are not in your HyperEVM wallet.",
    why: "Withdrawals are not pushed to your wallet. After the period, you or a relayer must execute the claim on the parent chain's Outbox.",
    testnet: "Available right after the 10 blocks.",
    mainnet: "Available once the challenge period ends.",
    action: "Call executeTransaction on the Outbox on the parent chain with the Merkle proof for your withdrawal. NodeInterface.constructOutboxProof on Elysium builds the proof.",
  },
  {
    id: "core",
    label: "Funds are on HyperEVM, not HyperCore",
    symptom: "USDC is in your HyperEVM wallet, but you cannot trade it on HyperCore.",
    why: "HyperEVM and HyperCore keep separate balances. Moving USDC from one to the other is its own step.",
    testnet: "About a second.",
    mainnet: "About a second.",
    action: "Send the USDC to HyperCore from your HyperEVM wallet with the HyperCore deposit action.",
  },
];

/** Where your money is between HyperCore, HyperEVM and Elysium, how long each hop takes, and what to do when something is stuck. */
export function FundsPanel() {
  const { chainId, snap, address } = useApp();
  const local = chainId === 31337;
  const { data: block } = useBlockNumber({ chainId, watch: true });
  const [pick, setPick] = useState(DIAGNOSES[1].id);
  const diag = DIAGNOSES.find((d) => d.id === pick)!;
  const exit = local
    ? { value: "None here", sub: "The local node has no challenge period" }
    : chainId === 99801
      ? { value: "10 blocks", sub: "On testnet. Mainnet is not published yet" }
      : { value: "Not published", sub: "Mainnet has not set one yet" };

  const stages = [
    { name: "HyperCore", desc: "Native perp balances", time: "Instant to HyperEVM" },
    { name: "HyperEVM", desc: "The parent chain", time: "About a second" },
    { name: "Elysium", desc: "Where Twoprint trades", time: "Deposits take about a minute", here: true },
    { name: "Challenge period", desc: "Withdrawals wait here", time: local ? "Not applicable locally" : "10 blocks on testnet, unpublished on mainnet" },
    { name: "Claim", desc: "On HyperEVM, then to HyperCore", time: "Right after the period ends" },
  ];

  return (
    <div className="stackp">
      <div className="readings">
        <Stat label="Your Elysium balance" value={snap?.user ? `${usdc(snap.user.usdc)} tUSDC` : address ? "0.00 tUSDC" : "Connect a wallet"} sub="Where Twoprint trades" />
        <Stat label={`Latest block on ${CHAIN_LABEL[chainId]}`} value={block !== undefined ? block.toString() : "Loading"} />
        <Stat label="Challenge period" value={exit.value} sub={exit.sub} />
      </div>

      <section className="panel ppanel" aria-labelledby="mm-path">
        <header className="ppanel__head">
          <div>
            <h2 id="mm-path">How your funds move</h2>
            <p>Money enters Elysium in about a minute and leaves only after a challenge period. That is why Twoprint trades the money already on Elysium: you skip the exit hop until you choose to take it.</p>
          </div>
        </header>
        <ol className="route" aria-label="The path of your funds">
          {stages.map((s, i) => (
            <li key={s.name} className="route__stop" data-here={s.here}>
              <span className="route__n" aria-hidden="true">
                {i + 1}
              </span>
              <span className="route__name">
                {s.name} {s.here && <Badge tone="carbon">Twoprint</Badge>}
              </span>
              <span className="route__desc">{s.desc}</span>
              <span className="route__time">{s.time}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="book" aria-labelledby="mm-where">
        <header className="book__head">
          <h2 id="mm-where">Where is my money?</h2>
          <p>Pick what you are seeing. Each case says why it happens, how long it takes, and what to do.</p>
        </header>
        <div className="diag">
          <div className="choices" role="radiogroup" aria-label="What you are seeing">
            {DIAGNOSES.map((d) => (
              <button key={d.id} type="button" role="radio" aria-checked={pick === d.id} className="choices__opt" onClick={() => setPick(d.id)}>
                {d.label}
              </button>
            ))}
          </div>
          <div className="diag__panel" role="region" aria-label={diag.label}>
            <h3>{diag.label}</h3>
            <dl className="facts">
              <div>
                <dt>What you see</dt>
                <dd>{diag.symptom}</dd>
              </div>
              <div>
                <dt>Why it happens</dt>
                <dd>{diag.why}</dd>
              </div>
              <div>
                <dt>How long, on testnet</dt>
                <dd>{diag.testnet}</dd>
              </div>
              <div>
                <dt>How long, on mainnet</dt>
                <dd>{diag.mainnet}</dd>
              </div>
              <div>
                <dt>What to do</dt>
                <dd>{diag.action}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="book" aria-labelledby="mm-lookup">
        <header className="book__head">
          <h2 id="mm-lookup">Look up a transaction</h2>
          <p>Paste a transaction hash to see whether it landed on {CHAIN_LABEL[chainId]}. Deposits start on the parent chain, so look those up on its explorer.</p>
        </header>
        <TxLookup />
      </section>
    </div>
  );
}

type Found = {
  status: "success" | "reverted" | "pending";
  block?: bigint;
  confirmations?: bigint;
  from?: string;
  to?: string | null;
};
type Lookup = { s: "idle" } | { s: "busy" } | { s: "missing" } | { s: "error"; message: string } | ({ s: "found" } & Found);

function TxLookup() {
  const { chainId } = useApp();
  const client = usePublicClient({ chainId });
  const [hash, setHash] = useState("");
  const [res, setRes] = useState<Lookup>({ s: "idle" });
  const h = hash.trim();

  const lookup = async () => {
    if (!client) return;
    if (!isHash(h)) {
      setRes({ s: "error", message: "A transaction hash is 0x followed by 64 hexadecimal characters." });
      return;
    }
    setRes({ s: "busy" });
    try {
      // Only the RPC's own "no such transaction" answers mean not found. A throttled, timed-out or failed read must show as an error, not as "Not found".
      const absent = (e: unknown) => {
        if (e instanceof TransactionNotFoundError || e instanceof TransactionReceiptNotFoundError) return null;
        throw e;
      };
      const [tx, receipt, head] = await Promise.all([client.getTransaction({ hash: h }).catch(absent), client.getTransactionReceipt({ hash: h }).catch(absent), client.getBlockNumber()]);
      if (!tx && !receipt) return setRes({ s: "missing" });
      if (!receipt) return setRes({ s: "found", status: "pending", from: tx?.from, to: tx?.to });
      setRes({
        s: "found",
        status: receipt.status === "success" ? "success" : "reverted",
        block: receipt.blockNumber,
        confirmations: head - receipt.blockNumber + 1n,
        from: receipt.from,
        to: receipt.to,
      });
    } catch (e) {
      setRes({ s: "error", message: (e as Error).message.split("\n")[0] });
    }
  };

  return (
    <div className="lookup">
      <form
        className="lookup__form"
        onSubmit={(e) => {
          e.preventDefault();
          lookup();
        }}
      >
        <Field as="label" label="Transaction hash">
          <Input small value={hash} onChange={(e) => setHash(e.target.value)} placeholder="0x…" spellCheck={false} autoComplete="off" aria-label="Transaction hash" />
        </Field>
        <Button type="submit" variant="secondary" busy={res.s === "busy"} disabled={!h}>
          Look up
        </Button>
      </form>
      {res.s === "error" && <Notice tone="error">{res.message}</Notice>}
      {res.s === "missing" && (
        <Notice tone="warn" title={`Not found on ${CHAIN_LABEL[chainId]}`}>
          No transaction with that hash exists here yet. It may still be pending on another network.
        </Notice>
      )}
      {res.s === "found" && (
        <Receipt label="Transaction">
          <ReceiptRow label="Status">
            <Badge tone={res.status === "success" ? "long" : res.status === "reverted" ? "short" : "warn"}>{res.status === "success" ? "Confirmed" : res.status === "reverted" ? "Reverted" : "Pending"}</Badge>
          </ReceiptRow>
          {res.block !== undefined && <ReceiptRow label="Block">{res.block.toString()}</ReceiptRow>}
          {res.confirmations !== undefined && <ReceiptRow label="Confirmations">{res.confirmations.toString()}</ReceiptRow>}
          {res.from && <ReceiptRow label="From">{short(res.from)}</ReceiptRow>}
          {res.to && <ReceiptRow label="To">{short(res.to)}</ReceiptRow>}
          <ReceiptRow label="Explorer">
            <TxLink chainId={chainId} hash={h} label={short(h)} />
          </ReceiptRow>
        </Receipt>
      )}
    </div>
  );
}
