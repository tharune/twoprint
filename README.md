# Twoprint frontend

The public browser interface for Twoprint, a BTC and ETH trading project on Elysium testnet.

[Open the testnet app](https://twoprint.vercel.app) · [Follow @twoprintlabs](https://x.com/twoprintlabs)

This repository contains React components, browser logic, styles, public assets, frontend tests and build configuration. The checked-in contract ABIs are public interfaces used by the browser; the address files contain public testnet or local-development addresses.

Contracts, keeper, verifier, attester, notifier, server API routes, deployment/signing scripts, operational configuration, internal research and private development history remain private.

## Development

Use Node.js 24 and pnpm 11. Install dependencies and start the interface:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://127.0.0.1:5173`. The default browser network is Elysium testnet. This repository does not start or deploy backend services. Tier verification needs a separately operated attester endpoint; without one, that optional feature is unavailable.

```sh
pnpm build
pnpm test
pnpm preview
```

The tests cover the included browser/helpers and CSP build checks. Private server-route tests and deployment/signing rehearsals are excluded. Build output is written to `dist/`; no workflow deploys it automatically.

## Browser configuration

Optional settings are listed in `.env.example`. Copy them to a local `.env.local` only when overrides are needed. Every `VITE_` setting is public in the built JavaScript; use public RPC endpoints without credentials. Changing an RPC or attester origin also requires updating the Content-Security-Policy in `vercel.json`.

The Vercel configuration builds static frontend files only. No server functions are included. The existing chart attribution and [third-party notice](NOTICE) are retained; dependencies keep their own license terms and existing file notices remain in force. This publication adds no repository-wide license grant.

Testnet only. tUSDC and DEMO are mock assets with no monetary value.
