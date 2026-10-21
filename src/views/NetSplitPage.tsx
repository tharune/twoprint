import { PageHeader } from "../components/ui";
import { NetSplit } from "./NetSplit";

/** The weekly share of what the house won, for traders who lost net. A preview: nothing is published or paid yet. An Advanced page. */
export function NetSplitPage() {
  return (
    <div className="wrap">
      <PageHeader title="Net Split" lede="A weekly share of what the house wins, for traders who lose net. Nothing is published or paid yet." />
      <NetSplit />
    </div>
  );
}
