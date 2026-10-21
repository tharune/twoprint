import { createConfig, http } from "wagmi";
import { injected, mock } from "wagmi/connectors";
import { anvilLocal, elysiumTestnet, ANVIL_DEV_ACCOUNT } from "./config/chains";
import { DEV } from "./config/dev";

/**
 * Two ways to sign:
 *  - a browser wallet (injected), on either chain;
 *  - the anvil dev account: wagmi's mock connector forwards eth_sendTransaction to the chain's RPC, and anvil
 *    signs with its own unlocked dev account. No private key is ever in this bundle. Local anvil, dev server only: a
 *    production build has no mock connector and no anvil chain (see createProductionConfig below), so a build that leaves this
 *    machine can only sign with a browser wallet on Elysium.
 */
export const DEV_CONNECTOR_ID = "mock";

/** Remember that the person chose the anvil dev account, so a reload reconnects it (per-browser convenience only). */
const DEV_FLAG = "twoprint.devAccount";
export function rememberDevAccount(on: boolean) {
  if (!DEV) return;
  try {
    if (on) localStorage.setItem(DEV_FLAG, "1");
    else localStorage.removeItem(DEV_FLAG);
  } catch {
    /* storage unavailable: no reconnect after reload */
  }
}
function devAccountRemembered() {
  if (!DEV) return false;
  try {
    return localStorage.getItem(DEV_FLAG) === "1";
  } catch {
    return false;
  }
}

/** Conduit's "Rate Limit Exceeded": JSON-RPC error -32017, in an HTTP 429 (single call) or in an HTTP 200 batch reply. */
const RATE_LIMITED = /"code"\s*:\s*-32017\b/;

/**
 * What viem decodes as "throttled" for sure: HTTP 200 and one -32017 error per request. A throttle that outlasts the retries
 * below is handed to viem in this shape whatever the RPC sent (an HTTP 429 that is not a JSON-RPC reply makes viem re-run the
 * whole retry loop, 4 x 6 = 24 requests per call, and one error object for a batch breaks viem's batch decoder: "An unknown
 * RPC error occurred", unrecognised by the ledger's throttled() check).
 */
function limitedReply(init: RequestInit | undefined): Response {
  let batch = false;
  let ids: unknown[] = [null];
  try {
    const body = JSON.parse(String(init?.body));
    batch = Array.isArray(body);
    ids = (batch ? body : [body]).map((x: { id?: unknown }) => x?.id ?? null);
  } catch {
    /* not JSON: answer one error */
  }
  const one = (id: unknown) => ({ jsonrpc: "2.0", id, error: { code: -32017, message: "Rate Limit Exceeded" } });
  return new Response(JSON.stringify(batch ? ids.map(one) : one(ids[0])), { status: 200, headers: { "content-type": "application/json" } });
}

/**
 * fetch for the Elysium transport that waits out the public RPC's rate limit (the keeper's rateLimitedFetch, ported). The limit
 * is per IP and shared with the keeper and anything else on the machine; measured 2026-10-18 it passes only ~7 eth_call or
 * eth_getLogs a second (eth_blockNumber 20+). viem retries neither reply shape, so without this a throttled read fails
 * outright: a fail toast before the wallet is even asked, or "Can't read the chain". Retries up to `retries` times with
 * exponential backoff and jitter (Retry-After when readable; CORS hides it from the page), then hands viem the last reply as is.
 * Only reads use this transport (an injected wallet sends through its own RPC; the anvil dev account never signs on 99801), so
 * sending a call again is always safe.
 */
export function rateLimitedFetch({
  fetchFn = globalThis.fetch,
  retries = 5,
  baseMs = 250,
  maxMs = 3000,
  random = Math.random,
  wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
  onLimited,
}: {
  fetchFn?: typeof fetch;
  retries?: number;
  baseMs?: number;
  maxMs?: number;
  random?: () => number;
  wait?: (ms: number) => Promise<unknown>;
  onLimited?: (x: { attempt: number; delayMs: number }) => void;
} = {}): typeof fetch {
  return async (input, init) => {
    for (let attempt = 0; ; attempt++) {
      const res = await fetchFn(input, init);
      const spent = attempt >= retries || !!init?.signal?.aborted;
      if (res.status !== 429 && (spent || !(res.status === 200 && RATE_LIMITED.test(await res.clone().text())))) return res;
      if (spent) {
        await res.body?.cancel().catch(() => {});
        return limitedReply(init); // an HTTP 429 that outlasted the retries
      }
      const retryAfterMs = Number(res.headers.get("retry-after")) * 1000;
      const delayMs = Math.round(retryAfterMs > 0 ? Math.min(retryAfterMs, maxMs) : Math.min(maxMs, baseMs * 2 ** attempt) * (0.5 + random() / 2));
      await res.body?.cancel().catch(() => {});
      onLimited?.({ attempt: attempt + 1, delayMs });
      await wait(delayMs);
    }
  };
}

/** The Elysium transport: batched reads that wait out the public RPC's rate limit. Production and dev use the same one. */
const elysiumTransport = () => http(elysiumTestnet.rpcUrls.default.http[0], { batch: { wait: 16 }, fetchFn: rateLimitedFetch() });

/** The dev server's config: the local anvil beside Elysium, and the anvil dev account beside the browser wallet. */
function createDevConfig() {
  return createConfig({
    chains: [anvilLocal, elysiumTestnet],
    connectors: [injected({ shimDisconnect: true }), mock({ accounts: [ANVIL_DEV_ACCOUNT], features: { reconnect: true, defaultConnected: devAccountRemembered() } })],
    transports: {
      [anvilLocal.id]: http(anvilLocal.rpcUrls.default.http[0], { batch: { wait: 16 } }),
      [elysiumTestnet.id]: elysiumTransport(),
    },
    pollingInterval: 1000,
  });
}

/**
 * The config a production build ships: Elysium and a browser wallet, nothing else. It is typed as the dev config so the views
 * (which name both chain ids) compile the same way. At run time the local chain is simply not configured: usePublicClient for it
 * answers undefined (wagmi catches the unconfigured-chain error), and this build never selects it (config/chains.ts).
 */
function createProductionConfig() {
  return createConfig({
    chains: [elysiumTestnet],
    connectors: [injected({ shimDisconnect: true })],
    transports: { [elysiumTestnet.id]: elysiumTransport() },
    pollingInterval: 1000,
  }) as unknown as ReturnType<typeof createDevConfig>;
}

export const wagmiConfig = DEV ? createDevConfig() : createProductionConfig();

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
