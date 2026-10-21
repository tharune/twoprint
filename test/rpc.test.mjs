import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createPublicClient, decodeFunctionData, encodeFunctionResult, http as httpTransport, multicall3Abi } from "viem";
import { feeRouterAbi } from "../src/abi/generated.js";
import { isNoSuchFunction } from "../src/lib/rpc.js";

// FSI-5: the app reads a router from before the split (no legMask()) as single-leg, but must not mistake a failing node
// for one. Real viem against a local JSON-RPC server that answers each case as a node would.

const FR = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
let reply; // (id, request) => [httpStatus, body]
const server = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const request = JSON.parse(raw);
    const [status, body] = reply(request.id, request);
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

const client = (u = url) => createPublicClient({ transport: httpTransport(u, { retryCount: 0 }) });
const legMaskError = (u) =>
  client(u)
    .readContract({ address: FR, abi: feeRouterAbi, functionName: "legMask" })
    .then(() => null, (e) => e);

test("a missing function (anvil and Elysium: code 3, empty revert data) means a router from before the split", async () => {
  reply = (id) => [200, { jsonrpc: "2.0", id, error: { code: 3, message: "execution reverted", data: "0x" } }];
  assert.equal(isNoSuchFunction(await legMaskError()), true);
});

test("an empty answer (no code at the address) counts as no such function too", async () => {
  reply = (id) => [200, { jsonrpc: "2.0", id, result: "0x" }];
  assert.equal(isNoSuchFunction(await legMaskError()), true);
});

test("a rate limit, a node failure or a dead RPC is a read error, not a single-leg router", async () => {
  reply = () => [429, { error: "rate limited" }];
  assert.equal(isNoSuchFunction(await legMaskError()), false);
  reply = (id) => [200, { jsonrpc: "2.0", id, error: { code: -32000, message: "header not found" } }];
  assert.equal(isNoSuchFunction(await legMaskError()), false);
  assert.equal(isNoSuchFunction(await legMaskError("http://127.0.0.1:9")), false);
  assert.equal(isNoSuchFunction(new Error("not a viem error")), false);
});

test("a split router answers legMask()", async () => {
  reply = (id) => [200, { jsonrpc: "2.0", id, result: "0x" + "7".padStart(64, "0") }];
  assert.equal(await client().readContract({ address: FR, abi: feeRouterAbi, functionName: "legMask" }), 7);
});

// The app's Elysium chain declares Multicall3, so on 99801 these reads go out batched through aggregate3. Live 99801
// (2026-10-19, the single-leg router) answers legMask() there with (success false, returnData 0x).
const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11";
const batched = createPublicClient({
  chain: {
    id: 99801,
    name: "Elysium (canned)",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [url] } },
    contracts: { multicall3: { address: MULTICALL3 } },
  },
  batch: { multicall: true },
  transport: httpTransport(url, { retryCount: 0 }),
});

test("batched through Multicall3, as on 99801: a router from before the split answers (false, 0x), no such function", async () => {
  let calls = 0;
  reply = (id, request) => {
    assert.equal(request.params[0].to.toLowerCase(), MULTICALL3.toLowerCase(), "the reads went out through Multicall3");
    const { args } = decodeFunctionData({ abi: multicall3Abi, data: request.params[0].data });
    calls = args[0].length;
    const result = encodeFunctionResult({ abi: multicall3Abi, functionName: "aggregate3", result: args[0].map(() => ({ success: false, returnData: "0x" })) });
    return [200, { jsonrpc: "2.0", id, result }];
  };
  const [mask, accrued] = await Promise.allSettled([
    batched.readContract({ address: FR, abi: feeRouterAbi, functionName: "legMask" }),
    batched.readContract({ address: FR, abi: feeRouterAbi, functionName: "legAccrued", args: [0] }),
  ]);
  assert.equal(calls, 2, "both reads in one aggregate3");
  assert.equal(mask.status, "rejected");
  assert.equal(isNoSuchFunction(mask.reason), true);
  assert.equal(accrued.status, "rejected");
});
