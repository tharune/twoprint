import { useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { BaseError, getAbiItem, parseEventLogs, toEventSelector, type Address, type Hex, type PublicClient } from "viem";
import { feeRouterAbi, houseVaultAbi, positionLensAbi, positionManagerAbi, priceRingAbi, testUSDCAbi, tierRegistryAbi } from "../abi/generated";
import { DEPLOYMENTS, DEV_CONTROL_URL, type ChainId, type Deployment } from "../config/chains";
import { parseLegSpends } from "../lib/legspends";
import { isNoSuchFunction } from "../lib/rpc";

const STATE = ["None", "PendingOpen", "Open", "PendingClose", "Closed", "Liquidated", "Cancelled"] as const;
export type StateName = (typeof STATE)[number];
export const TIER = ["Default", "Verified", "Flagged"] as const;

export interface Print {
  oraclePx: bigint;
  midPx: bigint;
  srcTimeMs: number;
  arbBlock: number;
  basisEwmaE8: number;
}

/**
 * Poll period per chain. Elysium's public RPC passes only ~7 eth_call or eth_getLogs a second per IP, and the keeper (and the
 * e2e harness) share that budget when they run on the same machine; a print lands there every ~3 s, so 2 s loses nothing.
 */
const pollMs = (chainId: number) => (chainId === 99801 ? 2_000 : 1_200);

// ====================================================================== snapshot (polled reads)

export interface Snapshot {
  block: bigint;
  fetchedAt: number;
  ring: {
    isFresh: boolean;
    lastSeq: bigint;
    lastSrcTimeMs: bigint;
    lastPostTimestamp: bigint;
    lastPostArbBlock: bigint;
    signer: Address;
    maxAgeBlocks: number;
    maxAgeSec: number;
    maxFutureSkewMs: number;
    maxPastSkewMs: number;
    maxPrintAgeSec: number;
  };
  markets: {
    count: number;
    /** PriceRing.marketFresh(market): global freshness AND this market printed within maxPrintAgeSec */
    fresh: boolean;
    latest: Print | null;
    sigmaE8: bigint;
    basisNowE8: bigint;
    longOI: bigint;
    shortOI: bigint;
    maxLongOI: bigint;
    maxShortOI: bigint;
  }[];
  pm: {
    maxLevDefault: number;
    maxLevVerified: number;
    fence: number;
    flaggedFence: number;
    winFeeBps: number;
    carryPerHourE8: number;
    premiumMultE4: number;
    sigmaFloorE8: number;
    maxFillAdjE8: number;
    minCollateral: bigint;
    maxPositionNotional: bigint;
    factorLongOI: bigint;
    factorShortOI: bigint;
    maxSideOI: bigint;
    maxNetOI: bigint;
    requiredCapital: bigint;
    stressLiability: bigint;
    freeEquity: bigint;
    totalIou: bigint;
    totalClaimable: bigint;
    stress: { btcUpBps: number; btcDnBps: number; ethUpBps: number; ethDnBps: number; ratioBps: number; maxUtilBps: number };
    isCloseOnly: boolean;
    guardianCloseOnly: boolean;
    nextId: bigint;
    escrowed: bigint;
    inBlackoutNow: boolean;
    blackouts: readonly { startSec: number; endSec: number; weekdayMask: number }[];
  };
  vault: {
    equity: bigint;
    premiumsReceived: bigint;
    tradingInflow: bigint;
    tradingOutflow: bigint;
    seedDeposited: bigint;
    seedWithdrawn: bigint;
    isCloseOnly: boolean;
    dayStartEquity: bigint;
    dayIndex: bigint;
    maxDailyDrawdownBps: bigint;
    /** close-only (and seed locked) until this unix time once the breaker trips */
    closeOnlyUntil: bigint;
    /** payable right now under the rolling 60-min outflow limit (and equity) */
    outflowRoom: bigint;
    maxOutflowBpsPerHour: bigint;
  };
  fees: {
    balance: bigint;
    totalFeesAccrued: bigint;
    totalFeesSpent: bigint;
    win: bigint;
    borrow: bigint;
    /** the swap-and-burn adapter, or the zero address while none is wired */
    adapter: Address;
    /** the fee split (legMask; legs TWOPRINT buyback, KNTQ buyback, team/ops), or null on a router deployed before it */
    split: null | {
      mask: number;
      accrued: readonly [bigint, bigint, bigint];
      spent: readonly [bigint, bigint, bigint];
      /** the KNTQ leg's adapter, or the zero address while no KNTQ venue is wired (that leg accrues) */
      kntqAdapter: Address;
      /** the only address the team/ops leg can pay, fixed at deploy */
      opsRecipient: Address;
    };
  };
  user: null | {
    address: Address;
    usdc: bigint;
    allowance: bigint;
    tier: number;
    eth: bigint;
    /** payouts deferred because a transfer failed (withdrawClaimable) */
    claimable: bigint;
  };
}

async function readSnapshot(client: PublicClient, d: Deployment, user?: Address): Promise<Snapshot> {
  const pm = { address: d.PositionManager, abi: positionManagerAbi } as const;
  const ring = { address: d.PriceRing, abi: priceRingAbi } as const;
  const vault = { address: d.HouseVault, abi: houseVaultAbi } as const;
  const fee = { address: d.FeeRouter, abi: feeRouterAbi } as const;
  const usdc = { address: d.TestUSDC, abi: testUSDCAbi } as const;
  const now = BigInt(Math.floor(Date.now() / 1000));

  const [block, isFresh, lastSeq, lastSrcTimeMs, lastPostTimestamp, lastPostArbBlock, signer, cfg, c0, c1] = await Promise.all([
    client.getBlockNumber({ cacheTime: 0 }),
    client.readContract({ ...ring, functionName: "isFresh" }),
    client.readContract({ ...ring, functionName: "lastSeq" }),
    client.readContract({ ...ring, functionName: "lastSrcTimeMs" }),
    client.readContract({ ...ring, functionName: "lastPostTimestamp" }),
    client.readContract({ ...ring, functionName: "lastPostArbBlock" }),
    client.readContract({ ...ring, functionName: "signer" }),
    client.readContract({ ...ring, functionName: "config" }),
    client.readContract({ ...ring, functionName: "printCount", args: [0] }),
    client.readContract({ ...ring, functionName: "printCount", args: [1] }),
  ]);
  const counts = [Number(c0), Number(c1)];

  // The rest starts at once, so viem's multicall batching sends it as one or two eth_calls (read at one block) instead of up
  // to six in a row: five round trips fewer, and every eth_call counts against Elysium's small per-IP budget (see pollMs).
  const marketReads = Promise.all([0, 1].map(async (m) => {
    const [latest, sigmaE8, basisNowE8, longOI, shortOI, caps, fresh] = await Promise.all([
      counts[m] > 0 ? client.readContract({ ...ring, functionName: "latestPrint", args: [m] }) : Promise.resolve(null),
      client.readContract({ ...ring, functionName: "sigmaE8", args: [m] }),
      client.readContract({ ...ring, functionName: "basisEwmaE8", args: [m] }),
      client.readContract({ ...pm, functionName: "longOI", args: [m] }),
      client.readContract({ ...pm, functionName: "shortOI", args: [m] }),
      client.readContract({ ...pm, functionName: "caps", args: [m] }),
      client.readContract({ ...ring, functionName: "marketFresh", args: [m] }),
    ]);
    return {
      count: counts[m],
      fresh,
      latest: latest as Print | null,
      sigmaE8: BigInt(sigmaE8),
      basisNowE8: BigInt(basisNowE8),
      longOI,
      shortOI,
      maxLongOI: caps[0],
      maxShortOI: caps[1],
    };
  }));
  // These reads start now but are awaited at the end. A failure is rethrown there; this only stops it surfacing first as an unhandled rejection.
  marketReads.catch(() => undefined);

  const stressReads = Promise.all([
    client.readContract({ ...pm, functionName: "stress" }),
    client.readContract({ ...pm, functionName: "stressLiability" }),
    client.readContract({ ...pm, functionName: "freeEquity" }),
    client.readContract({ ...pm, functionName: "totalIou" }),
    client.readContract({ ...pm, functionName: "totalClaimable" }),
  ]);

  const pmReads = Promise.all([
    client.readContract({ ...pm, functionName: "params" }),
    client.readContract({ ...pm, functionName: "factorLongOI" }),
    client.readContract({ ...pm, functionName: "factorShortOI" }),
    client.readContract({ ...pm, functionName: "factorCaps" }),
    client.readContract({ ...pm, functionName: "requiredCapital" }),
    client.readContract({ ...pm, functionName: "isCloseOnly" }),
    client.readContract({ ...pm, functionName: "guardianCloseOnly" }),
    client.readContract({ ...pm, functionName: "nextId" }),
    client.readContract({ ...pm, functionName: "escrowed" }),
    client.readContract({ ...pm, functionName: "inBlackout", args: [now] }),
    client.readContract({ ...pm, functionName: "blackouts" }),
  ]);

  const outflowReads = Promise.all([
    client.readContract({ ...vault, functionName: "closeOnlyUntil" }),
    client.readContract({ ...vault, functionName: "outflowRoom" }),
    client.readContract({ ...vault, functionName: "maxOutflowBpsPerHour" }),
  ]);
  const vaultReads = Promise.all([
    client.readContract({ ...vault, functionName: "equity" }),
    client.readContract({ ...vault, functionName: "premiumsReceived" }),
    client.readContract({ ...vault, functionName: "tradingInflow" }),
    client.readContract({ ...vault, functionName: "tradingOutflow" }),
    client.readContract({ ...vault, functionName: "seedDeposited" }),
    client.readContract({ ...vault, functionName: "seedWithdrawn" }),
    client.readContract({ ...vault, functionName: "isCloseOnly" }),
    client.readContract({ ...vault, functionName: "dayStartEquity" }),
    client.readContract({ ...vault, functionName: "dayIndex" }),
    client.readContract({ ...vault, functionName: "maxDailyDrawdownBps" }),
  ]);

  const feeReads = Promise.all([
    client.readContract({ ...usdc, functionName: "balanceOf", args: [d.FeeRouter] }),
    client.readContract({ ...fee, functionName: "totalFeesAccrued" }),
    client.readContract({ ...fee, functionName: "totalFeesSpent" }),
    client.readContract({ ...fee, functionName: "accruedByType", args: [0] }),
    client.readContract({ ...fee, functionName: "accruedByType", args: [1] }),
    client.readContract({ ...fee, functionName: "adapter" }),
  ]);
  const splitReads = readSplit(client, d); // starts its reads now too, so they ride the same multicall

  const userReads = user
    ? Promise.all([
        client.readContract({ ...usdc, functionName: "balanceOf", args: [user] }),
        client.readContract({ ...usdc, functionName: "allowance", args: [user, d.PositionManager] }),
        client.readContract({ address: d.TierRegistry, abi: tierRegistryAbi, functionName: "tierOf", args: [user] }),
        client.getBalance({ address: user }),
        client.readContract({ ...pm, functionName: "claimable", args: [user] }),
      ])
    : null;

  const [
    markets,
    [stressP, stressLiability, freeEquity, totalIou, totalClaimable],
    [params, factorLongOI, factorShortOI, factorCaps, requiredCapital, isCloseOnly, guardianCloseOnly, nextId, escrowed, inBlackoutNow, blackouts],
    [closeOnlyUntil, outflowRoom, maxOutflowBpsPerHour],
    [equity, premiumsReceived, tradingInflow, tradingOutflow, seedDeposited, seedWithdrawn, vClose, dayStartEquity, dayIndex, maxDailyDrawdownBps],
    [balance, totalFeesAccrued, totalFeesSpent, win, borrow, adapter],
    userRow,
    split,
  ] = await Promise.all([marketReads, stressReads, pmReads, outflowReads, vaultReads, feeReads, userReads, splitReads]);

  let userSnap: Snapshot["user"] = null;
  if (user && userRow) {
    const [bal, allowance, tier, eth, claimable] = userRow;
    userSnap = { address: user, usdc: bal, allowance, tier: Number(tier), eth, claimable };
  }

  return {
    block,
    fetchedAt: Date.now(),
    ring: {
      isFresh,
      lastSeq,
      lastSrcTimeMs,
      lastPostTimestamp,
      lastPostArbBlock,
      signer,
      maxAgeBlocks: Number(cfg[0]),
      maxAgeSec: Number(cfg[1]),
      maxFutureSkewMs: Number(cfg[6]),
      maxPastSkewMs: Number(cfg[7]),
      maxPrintAgeSec: Number(cfg[11]),
    },
    markets,
    pm: {
      maxLevDefault: params[0],
      maxLevVerified: params[1],
      fence: params[2],
      flaggedFence: params[3],
      winFeeBps: params[4],
      carryPerHourE8: params[5],
      premiumMultE4: params[6],
      sigmaFloorE8: params[7],
      maxFillAdjE8: params[8],
      minCollateral: params[10],
      maxPositionNotional: params[11],
      factorLongOI,
      factorShortOI,
      maxSideOI: factorCaps[0],
      maxNetOI: factorCaps[1],
      requiredCapital,
      stressLiability,
      freeEquity,
      totalIou,
      totalClaimable,
      stress: {
        btcUpBps: stressP[0],
        btcDnBps: stressP[1],
        ethUpBps: stressP[2],
        ethDnBps: stressP[3],
        ratioBps: stressP[4],
        maxUtilBps: stressP[5],
      },
      isCloseOnly,
      guardianCloseOnly,
      nextId,
      escrowed,
      inBlackoutNow,
      blackouts,
    },
    vault: {
      equity,
      premiumsReceived,
      tradingInflow,
      tradingOutflow,
      seedDeposited,
      seedWithdrawn,
      isCloseOnly: vClose,
      dayStartEquity,
      dayIndex,
      maxDailyDrawdownBps,
      closeOnlyUntil,
      outflowRoom,
      maxOutflowBpsPerHour,
    },
    fees: { balance, totalFeesAccrued, totalFeesSpent, win, borrow, adapter, split },
    user: userSnap,
  };
}

/**
 * The split's per-leg books, or null on a router deployed before the split (it has no legMask()). Any other failure
 * (transport, rate limit) throws like every other read here, so the app shows a read error, not a single-leg router.
 */
async function readSplit(client: PublicClient, d: Deployment): Promise<Snapshot["fees"]["split"]> {
  const fee = { address: d.FeeRouter, abi: feeRouterAbi } as const;
  // Every read starts at once, so multicall batching folds them into the snapshot's eth_calls (Elysium's per-IP budget
  // is small). On a router from before the split they all fail, and only legMask() decides.
  const books = Promise.all([
    client.readContract({ ...fee, functionName: "legAccrued", args: [0] }),
    client.readContract({ ...fee, functionName: "legAccrued", args: [1] }),
    client.readContract({ ...fee, functionName: "legAccrued", args: [2] }),
    client.readContract({ ...fee, functionName: "legSpent", args: [0] }),
    client.readContract({ ...fee, functionName: "legSpent", args: [1] }),
    client.readContract({ ...fee, functionName: "legSpent", args: [2] }),
    client.readContract({ ...fee, functionName: "kntqAdapter" }),
    client.readContract({ ...fee, functionName: "opsRecipient" }),
  ]);
  books.catch(() => undefined); // awaited below only when legMask() answers
  let mask: number;
  try {
    mask = Number(await client.readContract({ ...fee, functionName: "legMask" }));
  } catch (e) {
    if (isNoSuchFunction(e)) return null;
    throw e;
  }
  const [a0, a1, a2, s0, s1, s2, kntqAdapter, opsRecipient] = await books;
  return { mask, accrued: [a0, a1, a2], spent: [s0, s1, s2], kntqAdapter, opsRecipient };
}

export function useSnapshot(chainId: ChainId, user?: Address) {
  const client = usePublicClient({ chainId });
  const d = DEPLOYMENTS[chainId];
  return useQuery({
    queryKey: ["snapshot", chainId, d?.PositionManager, user],
    queryFn: () => readSnapshot(client as PublicClient, d as Deployment, user),
    enabled: !!client && !!d,
    refetchInterval: pollMs(chainId),
    retry: 1,
    // keep the last snapshot while refetching, but never carry one chain's data over to another
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[1] === chainId && prevQuery?.queryKey[3] === user ? prev : undefined),
  });
}

/** quoteOpen at the latest print (premium, margin, indicative level). Re-reads whenever a new print lands. */
export function useQuote(chainId: ChainId, market: number, isLong: boolean, collateral: bigint | null, leverage: number, printCount: number) {
  const client = usePublicClient({ chainId });
  const d = DEPLOYMENTS[chainId];
  return useQuery({
    queryKey: ["quote", chainId, market, isLong, collateral?.toString(), leverage, printCount],
    queryFn: async () => {
      const [notional, prem, margin, liq] = await client!.readContract({
        address: d!.PositionLens,
        abi: positionLensAbi,
        functionName: "quoteOpen",
        args: [market, isLong, collateral!, BigInt(leverage)],
      });
      return { notional, prem, margin, liq };
    },
    enabled: !!client && !!d && collateral !== null && collateral > 0n && leverage > 0 && printCount > 0,
    // Keep the previous quote only for the same order (a new print re-fetches it); edited inputs show no quote until the new one lands,
    // so the summary and the maxPremium guard are never built from another amount's premium.
    placeholderData: (prev, prevQuery) => {
      const k = prevQuery?.queryKey;
      return k && k[1] === chainId && k[2] === market && k[3] === isLong && k[4] === collateral?.toString() && k[5] === leverage ? prev : undefined;
    },
  });
}

// ====================================================================== ledger (incremental event log)

export interface TxRef {
  tx: Hex;
  block: bigint;
}
export interface PositionRecord {
  id: bigint;
  trader: Address;
  market: number;
  isLong: boolean;
  collateral: bigint;
  leverage: bigint;
  notional: bigint;
  premium: bigint;
  idxCommit: number;
  fence: number;
  commit: TxRef;
  fill?: TxRef & { idxFill: number; oraclePx: bigint; midPx: bigint; basisEwmaE8: number; fillPx: bigint; liqPx: bigint };
  /** earliestFill = idxCloseCommit + fence; the actual close print comes from PositionClosed (timing rule) */
  closeCommit?: TxRef & { idxCloseCommit: number; earliestFill: number };
  /** closes that voided (fill print > 120 s after the close commit): the position went back to Open */
  closeVoids: TxRef[];
  breach?: TxRef & { idx: number; oraclePx: bigint; midPx: bigint; premiumToVault: bigint };
  closed?: TxRef & {
    idxCloseFill: number;
    oraclePx: bigint;
    exitPx: bigint;
    pnl: bigint;
    carryPaid: bigint;
    winFee: bigint;
    payout: bigint;
    premiumReleased: bigint;
  };
  liquidated?: TxRef & { idx: number; oraclePx: bigint; caller: Address };
  cancelled?: TxRef;
  /** fee terms locked at commit (TermsSnapshotted) */
  terms?: { carryPerHourE8: number; winFeeBps: number; maxFillAdjE8: number };
  /** what the vault could not fund at close (IouRecorded), and what claim() has paid since (IouPaid) */
  iou?: { traderOwed: bigint; carryOwed: bigint; winOwed: bigint; traderPaid: bigint; carryPaid: bigint; winPaid: bigint; recorded: TxRef; lastPaid?: TxRef };
  /** pending margin commit waiting for effective print */
  marginPending?: bigint;
  /** margin additions applied on-chain (MarginAdded) */
  marginAdds?: { amount: bigint; idxEffective: number; newCollateral: bigint; newLiqPx: bigint; tx: Hex; block: bigint }[];
}

export const iouOutstanding = (i: NonNullable<PositionRecord["iou"]>) =>
  i.traderOwed + i.carryOwed + i.winOwed - (i.traderPaid + i.carryPaid + i.winPaid);


export function stateOf(p: PositionRecord): StateName {
  if (p.cancelled) return "Cancelled";
  if (p.liquidated) return "Liquidated";
  if (p.closed) return "Closed";
  if (p.closeCommit) return "PendingClose";
  if (p.fill) return "Open";
  return "PendingOpen";
}

/** Still waiting for a fill, open, or waiting for a close fill: the positions that can still move. */
export function isLive(p: PositionRecord): boolean {
  const s = stateOf(p);
  return s === "PendingOpen" || s === "Open" || s === "PendingClose";
}

export interface PrintEv extends Print {
  idx: number;
  block: bigint;
}
export interface BuybackEv extends TxRef {
  usdcSpent: bigint;
  tokensBurned: bigint;
}
/** One FeeRouter outflow (LegSpent), any leg. Σ amount == totalFeesSpent. */
export interface LegSpendEv extends TxRef {
  /** IFeeRouter.Leg: 0 TWOPRINT buyback, 1 KNTQ buyback, 2 team/ops */
  leg: number;
  /** the leg's adapter, or the ops recipient; absent on a router deployed before the split (no LegSpent) */
  to?: Address;
  amount: bigint;
  /** what a buyback leg got for it (tokens burned / KNTQ bought); null for team/ops */
  out: bigint | null;
}
export interface FeeEv extends TxRef {
  feeType: number;
  trader: Address;
  positionId: bigint;
  amount: bigint;
}
export interface PaidOutEv extends TxRef {
  positionId: bigint;
  requested: bigint;
  paid: bigint;
}
export interface RejectEv extends TxRef {
  market: number;
  prevOraclePx: bigint;
  oraclePx: bigint;
  boundE8: bigint;
}
export interface VaultEv extends TxRef {
  positionId: bigint;
  vaultDelta: bigint;
  premium: bigint;
}

// Prints held per market. Survival receipts and the chart replay of a finished order need the prints it spanned, and the
// Ledger rebuilds from the deploy block on every load, so this window is also how long a receipt stays visible. On Elysium
// the public RPC passes ~7 getLogs a second per IP (shared with the keeper when run on the same machine) and ~7 blocks a
// second go by, so 6,000 prints (~7 hours) already costs ~50 extra 4,000-block pages on a cold load;
// do not raise it there without persisting receipts. A local node has no such budget: 20,000.
const keepPrints = (chainId: number) => (chainId === 99801 ? 6_000 : 20_000);
const CHUNK = 4_000n;
/** Dense chunks read at once on a long catch-up: independent reads, ingested in order. Few enough to stay under a public RPC's rate limit. */
const LANES = 4;
/**
 * getLogs span where no print the ledger keeps can be: only the sparse logs are fetched there (PositionManager, FeeRouter,
 * HouseVault, PriceRing's PrintRejected). The public Elysium RPC answers 2M-block spans; an RPC with a lower cap shrinks it.
 */
const SPAN = 500_000n;
const PRINT_REJECTED = getAbiItem({ abi: priceRingAbi, name: "PrintRejected" });
const PRINT_APPENDED = toEventSelector(getAbiItem({ abi: priceRingAbi, name: "PrintAppended" }));
/** Rate limited (Conduit's -32017, or HTTP 429) even after the transport's own retries: that says nothing about the span. */
const throttled = (e: unknown) =>
  e instanceof BaseError && !!e.walk((x) => (x as { code?: unknown }).code === -32017 || (x as { status?: unknown }).status === 429);

export class Ledger {
  positions = new Map<bigint, PositionRecord>();
  prints: [PrintEv[], PrintEv[]] = [[], []];
  fees: FeeEv[] = [];
  buybacks: BuybackEv[] = [];
  legSpends: LegSpendEv[] = [];
  vault: VaultEv[] = [];
  rejected: RejectEv[] = [];
  paidOut: PaidOutEv[] = [];
  cursor: bigint;
  version = 0;
  ready = false;
  error: string | null = null;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private users = 0;
  private span = SPAN;
  /** Dense chunks read at once; one after a read that was too much for the node or the browser (a local chain's chunks are megabytes). */
  private lanes = LANES;

  constructor(
    private client: PublicClient,
    private d: Deployment,
    private period = 1_200,
  ) {
    this.cursor = BigInt(d.deployBlock ?? 0) - 1n;
  }

  private running = false;

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    this.users++;
    if (!this.running) this.loop();
    return () => {
      this.listeners.delete(fn);
      this.users--;
    };
  };
  getVersion = () => this.version;

  private emit() {
    this.version++;
    this.listeners.forEach((l) => l());
  }

  private reset() {
    this.positions.clear();
    this.prints = [[], []];
    this.fees = [];
    this.buybacks = [];
    this.legSpends = [];
    this.vault = [];
    this.rejected = [];
    this.paidOut = [];
    this.cursor = BigInt(this.d.deployBlock ?? 0) - 1n;
  }

  /** Single-flight polling loop: one poll at a time, stops when nobody is subscribed. */
  private loop = async () => {
    if (this.running) return;
    this.running = true;
    try {
      await this.poll();
      this.error = null;
    } catch (e) {
      this.error = (e as Error).message?.split("\n")[0] ?? String(e);
      this.emit();
    }
    this.running = false;
    if (this.users > 0) {
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(this.loop, this.period);
    }
  };

  private async poll() {
    const latest = await this.client.getBlockNumber({ cacheTime: 0 });
    if (latest < this.cursor) this.reset(); // chain restarted (anvil)
    let changed = false;
    // On a long catch-up (first load days after the deploy, a tab that slept) nearly every log is a PrintAppended the ledger
    // drops anyway: the keeper posts every ~3 s and only the last keepPrints(chainId) per market are kept. So PriceRing says where
    // the next print worth keeping landed, and the stretch before it (older prints, a feed outage) is covered in large
    // spans of the sparse logs only. The ledger ends up exactly as if it had read every log.
    let next = 0n; // first block that can hold a print to keep
    let ask = true; // ask PriceRing for `next`: at the start, and after a chunk without a print (a feed outage)
    let retried = false; // this sparse span already failed once
    while (this.cursor < latest) {
      const from = this.cursor + 1n;
      if (ask && from >= next && latest - this.cursor > CHUNK) next = await this.nextPrintBlock(latest);
      const dense = from >= next;
      if (dense && this.lanes > 1 && from + CHUNK <= latest) {
        // A long stretch of dense blocks (a first load, a tab that slept): a few chunks go out together. Their order is kept when
        // they are ingested, and a read that fails throws before any of them is, so the cursor never skips a chunk.
        const spans: [bigint, bigint][] = [];
        for (let f = from; f <= latest && spans.length < this.lanes; f += CHUNK) spans.push([f, f + CHUNK - 1n > latest ? latest : f + CHUNK - 1n]);
        let batch: Awaited<ReturnType<PublicClient["getLogs"]>>[];
        try {
          batch = await Promise.all(spans.map(([a, b]) => this.client.getLogs({ address: [this.d.PositionManager, this.d.PriceRing, this.d.FeeRouter, this.d.HouseVault], fromBlock: a, toBlock: b })));
        } catch (e) {
          if (throttled(e)) throw e;
          this.lanes = 1; // read them one at a time from here on: the cursor has not moved, so this stretch is read again
          continue;
        }
        batch.forEach((got, i) => {
          if (got.length) {
            this.ingest(got);
            changed = true;
          }
          this.cursor = spans[i][1];
        });
        ask = !batch[batch.length - 1].some((l) => l.topics[0] === PRINT_APPENDED);
        continue;
      }
      let to = from + (dense ? CHUNK : this.span) - 1n;
      if (!dense && to >= next) to = next - 1n;
      if (to > latest) to = latest;
      let logs: Parameters<typeof parseEventLogs>[0]["logs"];
      try {
        logs = dense
          ? await this.client.getLogs({ address: [this.d.PositionManager, this.d.PriceRing, this.d.FeeRouter, this.d.HouseVault], fromBlock: from, toBlock: to })
          : (
              await Promise.all([
                this.client.getLogs({ address: [this.d.PositionManager, this.d.FeeRouter, this.d.HouseVault], fromBlock: from, toBlock: to }),
                this.client.getLogs({ address: this.d.PriceRing, event: PRINT_REJECTED, fromBlock: from, toBlock: to }),
              ])
            ).flat();
      } catch (e) {
        // An RPC that caps the getLogs span (or times out on it) refuses the same span again, so shrink only on a second failure
        // in a row, and never on a throttle (the next poll retries it): the shrink lasts for the tab's lifetime.
        if (dense || this.span <= CHUNK || throttled(e)) throw e;
        if (retried) this.span = this.span / 8n > CHUNK ? this.span / 8n : CHUNK;
        retried = !retried;
        continue;
      }
      retried = false;
      if (logs.length) {
        this.ingest(logs);
        changed = true;
      }
      this.cursor = to;
      ask = dense && !logs.some((l) => l.topics[0] === PRINT_APPENDED);
    }
    if (!this.ready || changed) {
      this.ready = true;
      this.emit();
    }
  }

  /**
   * Block of the next print worth keeping as of block `at`: per market the one after the last held, or the oldest of the
   * last keepPrints(chainId) if that is later. Print.arbBlock is the L2 block (ArbSys on Elysium), the number getLogs filters on.
   */
  private async nextPrintBlock(at: bigint) {
    const ring = { address: this.d.PriceRing, abi: priceRingAbi, blockNumber: at } as const;
    const blocks = await Promise.all(
      [0, 1].map(async (m) => {
        const n = await this.client.readContract({ ...ring, functionName: "printCount", args: [m] });
        const idx = Math.max((this.prints[m].at(-1)?.idx ?? -1) + 1, n - keepPrints(this.d.chainId));
        if (idx >= n) return at + 1n; // none by `at`: the next one lands after it
        return BigInt((await this.client.readContract({ ...ring, functionName: "getPrint", args: [m, idx] })).arbBlock);
      }),
    );
    return blocks[0] < blocks[1] ? blocks[0] : blocks[1];
  }

  private ingest(logs: Parameters<typeof parseEventLogs>[0]["logs"]) {
    const by = (a: Address) => logs.filter((l) => l.address.toLowerCase() === a.toLowerCase());
    const ref = (l: { transactionHash: Hex | null; blockNumber: bigint | null }): TxRef => ({ tx: l.transactionHash!, block: l.blockNumber! });

    for (const l of parseEventLogs({ abi: priceRingAbi, logs: by(this.d.PriceRing), eventName: "PrintAppended" })) {
      const a = l.args;
      const arr = this.prints[a.market as 0 | 1];
      arr.push({ idx: Number(a.idx), oraclePx: a.oraclePx, midPx: a.midPx, srcTimeMs: Number(a.srcTimeMs), arbBlock: 0, basisEwmaE8: Number(a.basisEwmaE8), block: l.blockNumber! });
      const keep = keepPrints(this.d.chainId);
      if (arr.length > keep) arr.splice(0, arr.length - keep);
    }
    for (const l of parseEventLogs({ abi: priceRingAbi, logs: by(this.d.PriceRing), eventName: "PrintRejected" })) {
      this.rejected.push({ ...ref(l), market: Number(l.args.market), prevOraclePx: l.args.prevOraclePx, oraclePx: l.args.oraclePx, boundE8: l.args.boundE8 });
      if (this.rejected.length > 50) this.rejected.shift();
    }

    for (const l of parseEventLogs({ abi: positionManagerAbi, logs: by(this.d.PositionManager) })) {
      const r = ref(l);
      switch (l.eventName) {
        case "PositionCommitted": {
          const a = l.args;
          this.positions.set(a.id, {
            id: a.id,
            trader: a.trader,
            market: Number(a.market),
            isLong: a.isLong,
            collateral: a.collateral,
            leverage: a.leverage,
            notional: a.notional,
            premium: a.premium,
            idxCommit: Number(a.idxCommit),
            fence: Number(a.fence),
            commit: r,
            closeVoids: [],
          });
          break;
        }
        case "TermsSnapshotted": {
          const p = this.positions.get(l.args.id);
          if (p) p.terms = { carryPerHourE8: Number(l.args.carryPerHourE8), winFeeBps: Number(l.args.winFeeBps), maxFillAdjE8: Number(l.args.maxFillAdjE8) };
          break;
        }
        case "CloseVoided": {
          const p = this.positions.get(l.args.id);
          if (p) {
            p.closeVoids.push(r);
            p.closeCommit = undefined;
          }
          break;
        }
        case "IouRecorded": {
          const p = this.positions.get(l.args.id);
          const a = l.args;
          if (p) p.iou = { traderOwed: a.traderOwed, carryOwed: a.carryOwed, winOwed: a.winOwed, traderPaid: 0n, carryPaid: 0n, winPaid: 0n, recorded: r };
          break;
        }
        case "IouPaid": {
          const p = this.positions.get(l.args.id);
          if (p?.iou) {
            p.iou.traderPaid += l.args.traderPaid;
            p.iou.carryPaid += l.args.carryPaid;
            p.iou.winPaid += l.args.winPaid;
            p.iou.lastPaid = r;
          }
          break;
        }
        case "PositionFilled": {
          const p = this.positions.get(l.args.id);
          const a = l.args;
          if (p) p.fill = { ...r, idxFill: Number(a.idxFill), oraclePx: a.oraclePx, midPx: a.midPx, basisEwmaE8: Number(a.basisEwmaE8), fillPx: a.fillPx, liqPx: a.liqPx };
          break;
        }
        case "CloseCommitted": {
          const p = this.positions.get(l.args.id);
          if (p) p.closeCommit = { ...r, idxCloseCommit: Number(l.args.idxCloseCommit), earliestFill: Number(l.args.earliestIdxCloseFill) };
          break;
        }
        case "BreachObserved": {
          const p = this.positions.get(l.args.id);
          const a = l.args;
          if (p) p.breach = { ...r, idx: Number(a.idx), oraclePx: a.oraclePx, midPx: a.midPx, premiumToVault: a.premiumToVault };
          break;
        }
        case "PositionClosed": {
          const p = this.positions.get(l.args.id);
          const a = l.args;
          if (p)
            p.closed = {
              ...r,
              idxCloseFill: Number(a.idxCloseFill),
              oraclePx: a.oraclePx,
              exitPx: a.exitPx,
              pnl: a.pnl,
              carryPaid: a.carryPaid,
              winFee: a.winFee,
              payout: a.payout,
              premiumReleased: a.premiumReleased,
            };
          break;
        }
        case "PositionLiquidated": {
          const p = this.positions.get(l.args.id);
          if (p) p.liquidated = { ...r, idx: Number(l.args.idx), oraclePx: l.args.oraclePx, caller: l.args.caller };
          break;
        }
        case "PendingCancelled": {
          const p = this.positions.get(l.args.id);
          if (p) p.cancelled = r;
          break;
        }
        case "MarginCommitted": {
          const p = this.positions.get(l.args.id);
          if (p) p.marginPending = l.args.amount;
          break;
        }
        case "MarginAdded": {
          const p = this.positions.get(l.args.id);
          if (p) {
            // The event carries the new total, not the amount added.
            const added = l.args.newCollateral - p.collateral;
            p.collateral = l.args.newCollateral;
            // fill.liqPx stays the level fixed at the fill: each print is judged against the level in force at it (levelAt in lib/receipt.ts).
            p.marginPending = 0n;
            if (!p.marginAdds) p.marginAdds = [];
            p.marginAdds.push({
              amount: added,
              idxEffective: Number(l.args.idxEffective),
              newCollateral: l.args.newCollateral,
              newLiqPx: l.args.newLiqPx,
              tx: r.tx,
              block: r.block,
            });
          }
          break;
        }
        case "MarginRefunded": {
          const p = this.positions.get(l.args.id);
          if (p) p.marginPending = 0n;
          break;
        }
      }
    }

    for (const l of parseEventLogs({ abi: feeRouterAbi, logs: by(this.d.FeeRouter), eventName: "FeeCollected" })) {
      this.fees.push({ ...ref(l), feeType: Number(l.args.feeType), trader: l.args.trader, positionId: l.args.positionId, amount: l.args.amount });
    }
    for (const l of parseEventLogs({ abi: feeRouterAbi, logs: by(this.d.FeeRouter), eventName: "BuybackExecuted" })) {
      this.buybacks.push({ ...ref(l), usdcSpent: l.args.usdcSpent, tokensBurned: l.args.tokensBurned });
    }
    for (const s of parseLegSpends(by(this.d.FeeRouter))) this.legSpends.push(s);
    for (const l of parseEventLogs({ abi: houseVaultAbi, logs: by(this.d.HouseVault), eventName: "PaidOut" })) {
      this.paidOut.push({ ...ref(l), positionId: l.args.positionId, requested: l.args.requested, paid: l.args.paid });
    }
    for (const l of parseEventLogs({ abi: houseVaultAbi, logs: by(this.d.HouseVault), eventName: "Settled" })) {
      this.vault.push({ ...ref(l), positionId: l.args.positionId, vaultDelta: l.args.vaultDelta, premium: l.args.premium });
    }
  }
}

const ledgers = new Map<string, Ledger>();
function ledgerFor(chainId: number, client: PublicClient, d: Deployment) {
  const key = `${chainId}:${d.PositionManager}`;
  let l = ledgers.get(key);
  if (!l) ledgers.set(key, (l = new Ledger(client, d, pollMs(chainId))));
  return l;
}

const NOOP = () => () => {};
export function useLedger(chainId: ChainId) {
  const client = usePublicClient({ chainId }) as PublicClient | undefined;
  const d = DEPLOYMENTS[chainId];
  const ledger = useMemo(() => (client && d ? ledgerFor(chainId, client, d) : null), [chainId, client, d]);
  const version = useSyncExternalStore(ledger ? ledger.subscribe : NOOP, ledger ? ledger.getVersion : () => 0);
  return { ledger, version };
}

/** On-chain position struct for one id (commit times, scan checkpoint, resolved close print). */
export function useLivePosition(chainId: ChainId, id: bigint | undefined) {
  const client = usePublicClient({ chainId });
  const d = DEPLOYMENTS[chainId];
  return useQuery({
    queryKey: ["position", chainId, d?.PositionManager, id?.toString()],
    queryFn: () => client!.readContract({ address: d!.PositionManager, abi: positionManagerAbi, functionName: "getPosition", args: [id!] }),
    enabled: !!client && !!d && id !== undefined,
    refetchInterval: pollMs(chainId),
  });
}

// ====================================================================== optional local development control

export interface DevStatus {
  source: "walk" | "hl";
  intervalMs: number;
  lastSeq: string;
  offsetBp: Record<string, number>;
  queued: Record<string, number>;
  pausedSec?: number;
}

export function useDevControl(enabled: boolean) {
  return useQuery({
    queryKey: ["devcontrol", enabled],
    queryFn: async (): Promise<DevStatus | null> => {
      try {
        const r = await fetch(`${DEV_CONTROL_URL}/status`, { signal: AbortSignal.timeout(800) });
        return r.ok ? ((await r.json()) as DevStatus) : null;
      } catch {
        return null;
      }
    },
    enabled,
    refetchInterval: 1500,
    retry: false,
  });
}

export async function devControl(path: string) {
  const r = await fetch(`${DEV_CONTROL_URL}${path}`, { method: "POST" });
  if (!r.ok) throw new Error(`dev control ${path}: HTTP ${r.status}`);
  return r.json();
}

/** Ticks once per `ms` so ages ("3.2 s ago") update between snapshots. */
export function useNow(ms = 500) {
  const subscribe = useMemo(() => (fn: () => void) => {
    const t = setInterval(fn, ms);
    return () => clearInterval(t);
  }, [ms]);
  return useSyncExternalStore(subscribe, () => Math.floor(Date.now() / ms) * ms);
}
