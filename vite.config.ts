import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { cspGuards } from "./scripts/csp-guards.mjs";

/**
 * The tags a link preview needs and a relative address cannot give: crawlers want the image's full URL. They are added when the
 * page's address is known at build time (VITE_SITE_URL, or the production domain Vercel gives the build) and left out otherwise,
 * so a local build carries none that point nowhere.
 */
// public/og.png has the page's headline baked in ("Leverage you can verify."). Set this to false when the headline changes and the
// image has not been regenerated yet: the card is then text-only instead of showing the old line.
const OG_IMAGE_CURRENT = true;

const socialCard = (site: string): Plugin => ({
  name: "social-card",
  transformIndexHtml(html) {
    if (!site) return html;
    const alt = "Twoprint: Leverage you can verify. 100x on BTC and ETH, priced by Hyperliquid\u2019s oracle and settled on Elysium.";
    const image = [
      `<meta property="og:image" content="${site}/og.png" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta property="og:image:alt" content="${alt}" />`,
      `<meta name="twitter:image" content="${site}/og.png" />`,
    ];
    const tags = [`<meta property="og:url" content="${site}/" />`, ...(OG_IMAGE_CURRENT ? image : [])];
    if (OG_IMAGE_CURRENT) html = html.replace('content="summary"', 'content="summary_large_image"');
    return html.replace(/\s*<\/head>/, `\n${tags.map((t) => `    ${t}`).join("\n")}\n  </head>`);
  },
});

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, ".", "");
  const site = (env.VITE_SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : "")).replace(/\/+$/, "");
  return {
    // cspGuards: a production build fails if vercel.json's Content-Security-Policy would block the page's inline script, or an RPC or
    // attester origin the build was given (see scripts/csp-guards.mjs).
    plugins: [react(), cspGuards(), socialCard(site)],
    // The app reads import.meta.env as a whole object (config/chains.ts), so Vite inlines EVERY exposed variable, used or not. A build
    // exposes only the names the app reads: a stray VITE_ variable, the VITE_VERCEL_* ones Vercel adds to a Vite project (commit
    // message, author, repository) or the dev-only VITE_ANVIL_RPC / VITE_DEV_CONTROL_URL never reach the public bundle.
    envPrefix: command === "build" ? ["VITE_ELYSIUM_", "VITE_ATTESTER_URL", "VITE_MAX_PREMIUM_MULT"] : "VITE_",
    // Relative asset URLs: the app uses hash routing, so it must also load from a sub-path (GitHub Pages project site, an IPFS gateway path).
    base: "./",
    server: { host: "127.0.0.1", port: 5173, strictPort: true },
    build: { target: "es2022", chunkSizeWarningLimit: 1500 },
  };
});
