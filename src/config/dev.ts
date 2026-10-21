/**
 * True only on the Vite dev server (`pnpm dev`). A production build replaces `import.meta.env.DEV` with `false`, so everything
 * guarded by this flag (the anvil chain, its public dev account and wallet connector, the local deployment addresses, the
 * dev-script URL) is dropped from the bundle and never reaches a build that leaves this machine. `vite preview` serves a
 * production build, so it has none of them either; use `pnpm dev` with `?chain=31337` for the local node.
 *
 * The `typeof` check is for Node (the unit tests and scripts), where there is no import.meta.env: that reads as "not dev".
 */
export const DEV: boolean = typeof import.meta.env !== "undefined" && import.meta.env.DEV === true;
