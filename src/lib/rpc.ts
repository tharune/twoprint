import { BaseError } from "viem";

// viem errors meaning "the contract has no such function": it reverts with no data, or answers 0x (no code). Anvil and
// Elysium both answer a call to a missing function with {"code":3,"message":"execution reverted","data":"0x"}.
// Same set as the verifier's ledger.js.
const NO_SUCH_FUNCTION = new Set(["ContractFunctionRevertedError", "ContractFunctionZeroDataError", "ExecutionRevertedError"]);

/** True when a failed view call means the contract lacks the function, not that the node or the network failed. */
export const isNoSuchFunction = (e: unknown): boolean => e instanceof BaseError && !!e.walk((x) => NO_SUCH_FUNCTION.has((x as Error).name));
