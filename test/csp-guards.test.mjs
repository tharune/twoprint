import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { connectAllows, cspGuards, cspHash, inlineScripts, policySources } from "../scripts/csp-guards.mjs";

// The checks that hold a production build to vercel.json's Content-Security-Policy, and the preview server that applies those
// headers. A mismatch between the policy and the app is only ever seen in a visitor's browser, so the build has to see it first.

const policy = (value) => ({ headers: [{ source: "/(.*)", headers: [{ key: "Content-Security-Policy", value }] }] });
function withConfig(config) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "csp-guards-"));
  const file = path.join(dir, "vercel.json");
  fs.writeFileSync(file, JSON.stringify(config));
  return file;
}
const INLINE = '\n      try { document.documentElement.dataset.theme = "dark"; } catch (e) {}\n    ';
const PAGE = (script = INLINE) => `<!doctype html><html><head><script>${script}</script><script type="module" src="./a.js"></script><script type="application/json">{"a":1}</script></head><body></body></html>`;

test("the executable inline scripts of a page: not the ones with a src, not empty, not data blocks", () => {
  assert.deepEqual(inlineScripts(PAGE()), [INLINE]);
  assert.deepEqual(inlineScripts('<script> </script><script src="x.js"></script><script type="text/template">t</script>'), []);
  assert.deepEqual(inlineScripts('<script type="module">import "./x.js"</script>'), ['import "./x.js"']);
});

test("a hash is the browser's: sha-256 of the exact text between the tags, base64, in quotes", () => {
  // the well-known CSP example: the empty string
  assert.equal(cspHash(""), "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='");
});

test("script-src and connect-src sources are read out of the Content-Security-Policy header", () => {
  const file = withConfig(policy("default-src 'none'; script-src 'self' 'sha256-abc=' https://s3.tradingview.com; connect-src 'self' https://rpc.example"));
  assert.deepEqual(policySources("script-src", file), ["'self'", "'sha256-abc='", "https://s3.tradingview.com"]);
  assert.deepEqual(policySources("connect-src", file), ["'self'", "https://rpc.example"]);
  assert.equal(policySources("frame-src", file), null, "a directive the policy lacks");
  assert.equal(policySources("script-src", path.join(os.tmpdir(), "no-such-vercel.json")), null, "no file, no policy");
});

test("connect-src allows an exact origin, a scheme source and a host wildcard, and nothing else", () => {
  const sources = ["'self'", "https://rpc.example", "wss://api.example", "https://*.tunnel.example"];
  assert.equal(connectAllows(sources, "https://rpc.example/key/abc?x=1"), true, "the path and query are not part of an origin");
  assert.equal(connectAllows(sources, "http://rpc.example"), false, "another scheme");
  assert.equal(connectAllows(sources, "https://rpc.example:8443"), false, "another port");
  assert.equal(connectAllows(sources, "https://a.tunnel.example"), true);
  assert.equal(connectAllows(sources, "https://tunnel.example"), false, "a wildcard needs a subdomain");
  assert.equal(connectAllows(sources, "https://evil.example"), false);
  assert.equal(connectAllows(["https:"], "https://anything.example"), true, "a scheme source");
});

test("the build fails, with the hash to paste, when the page's inline script is not in script-src", () => {
  const good = withConfig(policy(`script-src 'self' ${cspHash(INLINE)}`));
  const plugin = cspGuards({ file: good });
  assert.equal(plugin.transformIndexHtml.handler(PAGE()), undefined, "the allowed script passes");
  assert.throws(() => plugin.transformIndexHtml.handler(PAGE(INLINE + "/* edited */")), (e) => e.message.includes(cspHash(INLINE + "/* edited */")) && /script-src/.test(e.message));
  const stale = withConfig(policy("script-src 'self' 'sha256-OLD='"));
  assert.throws(() => cspGuards({ file: stale }).transformIndexHtml.handler(PAGE()), /does not allow/);
  const none = withConfig({ headers: [] });
  assert.equal(cspGuards({ file: none }).transformIndexHtml.handler(PAGE("anything")), undefined, "no policy, nothing to hold the page to");
});

test("the build fails when an RPC or attester origin it was given is not in connect-src; a loopback one only warns locally and fails on Vercel", () => {
  const file = withConfig(policy("connect-src 'self' https://rpc.example"));
  const resolve = (env, onVercel = false) => cspGuards({ file, onVercel: () => onVercel }).configResolved({ env });
  assert.doesNotThrow(() => resolve({}), "nothing configured");
  assert.doesNotThrow(() => resolve({ VITE_ELYSIUM_RPC: "https://rpc.example/v1/key" }), "an allowed RPC (key and all)");
  assert.throws(() => resolve({ VITE_ELYSIUM_RPC: "https://other.example/v1/key" }), (e) => e.message.includes("https://other.example") && !e.message.includes("/v1/key"), "the message names the origin, never the key");
  assert.throws(() => resolve({ VITE_ATTESTER_URL: "https://attester.example" }), /VITE_ATTESTER_URL.*connect-src/);
  assert.throws(() => resolve({ VITE_ATTESTER_URL: "not a url" }), /not a URL/);

  const warn = console.warn;
  const warned = [];
  console.warn = (m) => warned.push(m);
  try {
    assert.doesNotThrow(() => resolve({ VITE_ATTESTER_URL: "http://127.0.0.1:8790" }, false), "a rehearsal build on this machine");
  } finally {
    console.warn = warn;
  }
  assert.equal(warned.length, 1);
  assert.throws(() => resolve({ VITE_ATTESTER_URL: "http://127.0.0.1:8790" }, true), /every visitor's browser would call their own machine/);
  assert.throws(() => resolve({ VITE_ELYSIUM_RPC: "http://localhost:8545" }, true), /Vercel build/);
});
