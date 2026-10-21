// Two checks that keep vercel.json's Content-Security-Policy and the app that ships under it from drifting apart. Both run in
// every production build (a Vite plugin, wired in vite.config.ts) and fail it with the line to fix, because a mismatch shows up
// only in a visitor's browser console, if at all:
//
//   1. index.html's one inline script (it sets the saved theme before first paint, so the page never flashes light) is allowed
//      by its SHA-256 hash, not by 'unsafe-inline'. Change a character of it and the browser silently stops running it.
//   2. The origins this build was told to call (VITE_ELYSIUM_RPC, VITE_ATTESTER_URL) must be in connect-src, or the browser
//      blocks every request to them. On Vercel a loopback address there is an error too: it would make every visitor's browser
//      call their own machine. Locally (no VERCEL in the environment) that is only a warning, for a rehearsal build.
//
// (A .mjs beside a .d.mts because the app has no @types/node for vite.config.ts to import node:fs with.)
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const VERCEL_JSON = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../vercel.json");

/** The CSP source for a script's text. The browser hashes the text exactly as it sits between the tags. */
export const cspHash = (text) => `'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`;

/** The executable inline scripts of an HTML document: no src, not empty, not a data block (type="application/json"). */
export function inlineScripts(html) {
  const out = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(m[1])?.[1]?.toLowerCase();
    const executable = !type || type === "module" || type.endsWith("javascript");
    if (executable && !/\bsrc\s*=/i.test(m[1]) && m[2].trim() !== "") out.push(m[2]);
  }
  return out;
}

/** The sources a Content-Security-Policy header in vercel.json gives `directive`, or null when the file has no such policy. */
export function policySources(directive, file = VERCEL_JSON) {
  let config;
  try {
    config = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
  for (const entry of config.headers ?? []) {
    for (const { key, value } of entry.headers ?? []) {
      if (key.toLowerCase() !== "content-security-policy") continue;
      const found = value.split(";").map((d) => d.trim().split(/\s+/)).find(([name]) => name === directive);
      if (found) return found.slice(1);
    }
  }
  return null;
}

/** Whether a connect-src source list lets the page call `url`: an exact origin, a scheme source (https:) or a host wildcard (https://*.x.y). */
export function connectAllows(sources, url) {
  const u = new URL(url);
  return sources.some((s) => {
    if (s === u.origin || s === `${u.protocol}`) return true;
    const wildcard = /^(\w+):\/\/\*\.(.+)$/.exec(s);
    return !!wildcard && wildcard[1] + ":" === u.protocol && u.hostname.endsWith(`.${wildcard[2]}`);
  });
}

const LOOPBACK = ["127.0.0.1", "localhost", "[::1]"];

/** The two checks, as one Vite plugin. `file` is the vercel.json to hold the build to (tests pass another). */
export function cspGuards({ file = VERCEL_JSON, onVercel = () => !!process.env.VERCEL } = {}) {
  return {
    name: "twoprint:csp-guards",
    apply: "build",

    configResolved(config) {
      const connect = policySources("connect-src", file);
      if (!connect) return; // no policy to hold the build to (a build outside this repo)
      for (const name of ["VITE_ELYSIUM_RPC", "VITE_ATTESTER_URL"]) {
        const value = config.env?.[name];
        if (!value) continue;
        let url;
        try {
          url = new URL(value);
        } catch {
          throw new Error(`${name} is not a URL: ${value}`);
        }
        const loopback = LOOPBACK.includes(url.hostname);
        if (loopback && onVercel()) {
          throw new Error(`${name} points at ${url.host} on a Vercel build: every visitor's browser would call their own machine. Unset it for this environment, or use a public https URL.`);
        }
        if (!connectAllows(connect, value)) {
          const problem = `${name} (${url.origin}) is not allowed by connect-src in vercel.json, so browsers would block every request to it. Add ${url.origin} to connect-src.`;
          if (loopback && !onVercel()) console.warn(`warning: ${problem} (fine for a rehearsal build served from this machine)`);
          else throw new Error(problem);
        }
      }
    },

    transformIndexHtml: {
      order: "post",
      handler(html) {
        const allowed = policySources("script-src", file);
        if (!allowed) return;
        const hashes = inlineScripts(html).map(cspHash);
        const missing = hashes.filter((h) => !allowed.includes(h));
        if (missing.length) {
          throw new Error(
            `index.html has an inline script that the Content-Security-Policy in vercel.json does not allow, so browsers would block it.\n` +
              `Add this to its script-src (and drop the old 'sha256-...' there):  ${missing.join("  ")}`,
          );
        }
        const unused = allowed.filter((s) => s.startsWith("'sha256-") && !hashes.includes(s));
        if (unused.length) console.warn(`vercel.json script-src allows a hash that no inline script in index.html has any more: ${unused.join(" ")}`);
      },
    },
  };
}
