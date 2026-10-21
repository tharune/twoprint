import { useState } from "react";
import { Segmented } from "../../components/ui";
import { useThemeName } from "../../lib/theme";

type Layout = "basic" | "advanced";

const ALT: Record<Layout, string> = {
  basic: "The Trade page in the Basic layout: a price chart, a simple order form and your open positions.",
  advanced: "The Trade page in the Advanced layout: candles with the oracle's prices over them, a longer order form and the full position tables.",
};

/**
 * The Trade page in each layout, one over the other, with the switch the app has. The pictures are the app itself in the
 * theme the visitor is in, so what the page shows is what they get.
 */
export function ModesVisual() {
  const theme = useThemeName();
  const [layout, setLayout] = useState<Layout>("advanced");
  return (
    <figure className="stage modes">
      <div className="modes__bar">
        <Segmented
          label="Layout"
          size="sm"
          value={layout}
          onChange={setLayout}
          options={[
            { value: "basic", label: "Basic" },
            { value: "advanced", label: "Advanced" },
          ]}
        />
      </div>
      <div className="modes__frame">
        {(["basic", "advanced"] as const).map((l) => (
          <img
            key={l}
            className="modes__img"
            data-on={layout === l || undefined}
            src={`./landing/trade-${l}-${theme}.webp`}
            width={1200}
            height={702}
            alt={layout === l ? ALT[l] : ""}
            aria-hidden={layout === l ? undefined : true}
            loading="lazy"
            decoding="async"
          />
        ))}
      </div>
    </figure>
  );
}
