/// <reference types="vite/client" />

/** Build-time settings; .env.example documents each one. All optional. */
interface ImportMetaEnv {
  readonly VITE_ELYSIUM_RPC?: string;
  readonly VITE_ELYSIUM_EXPLORER_URL?: string;
  readonly VITE_ANVIL_RPC?: string;
  readonly VITE_DEV_CONTROL_URL?: string;
  readonly VITE_ATTESTER_URL?: string;
  readonly VITE_MAX_PREMIUM_MULT?: string;
}
