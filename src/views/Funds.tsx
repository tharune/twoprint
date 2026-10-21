import { PageHeader } from "../components/ui";
import { FundsPanel } from "./MoneyMap";

/** Where your money is between HyperCore, HyperEVM and Elysium, and what to do when something is stuck. An Advanced page. */
export function Funds() {
  return (
    <div className="wrap">
      <PageHeader title="Funds" lede="Where your money is between HyperCore, HyperEVM and Elysium, and what to do if something is stuck." />
      <FundsPanel />
    </div>
  );
}
