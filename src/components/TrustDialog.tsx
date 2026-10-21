import { useApp } from "../app-context";
import { OPS_LEG, enabledLegs, splitPhrase } from "../lib/split";
import { IconCheck, IconClose } from "./icons";
import { Modal } from "./ui";
import { verifyAvailable } from "./VerifyTier";

interface Role {
  name: string;
  /** What the party can do to you, and what it cannot, in the words the project stands behind. One row each; a list is several rows. */
  can: string | string[];
  cannot: string | string[];
}

const rows = (v: string | string[]) => (Array.isArray(v) ? v : [v]);

const ROLES: Role[] = [
  {
    name: "Price signer",
    can: [
      "Signs the Hyperliquid prices that every trade settles on.",
      "Sees your order. Every order is public once placed, and the signer chooses which allowed price comes next.",
      "If compromised, it could fill or liquidate any order it has seen, within the allowed price move. With two allowed prices in a row it could liquidate every open 100x position.",
    ],
    cannot: [
      "Post a price stamped more than 5 s ahead of, or 30 s behind, the chain's clock.",
      "Move a market by more than 3% in one update when 3 s have passed since the last one, as long as the owner leaves that limit alone. It grows with the square root of the gap.",
      "Fill you before two newer prices have been posted.",
      "Fill you on a price stamped less than 1 s after your order. That stamp comes from the signer's own clock, which the contracts accept up to 5 s ahead of the chain's, so the 1 s wait is only as reliable as that clock.",
      "Make the vault pay out more than 10% of its equity in any 60 minutes. Anything over that becomes an IOU, an unpaid balance owed to a winner. That slows how fast false prices can drain the vault, but it doesn't protect traders, and IOUs already recorded are still owed after the signer is replaced.",
    ],
  },
  {
    name: "Owner",
    can: [
      "Changes settings within fixed limits. The exception is the price feed: only its time limits (5 s ahead, 30 s behind) are fixed, and the jump limit below can be raised without a cap, in one step.",
      "Sets position caps. A cap of zero stops new trades.",
      "Pauses new trades, so people can only close.",
      "Replaces the price signer immediately, and replaces the history verifier.",
      "Today one key controls all of this, with no multisig (shared approval) and no timelock (delay).",
    ],
    cannot: "Touch vault funds, or change an open position's terms, except to tighten how far a fill can move from the oracle price.",
  },
  {
    name: "Vault team",
    can: "Deposits the starting balance and takes back up to that amount. On this deployment it is the same key as the owner.",
    cannot: "Take any surplus. It also can't withdraw while IOUs are owed, the vault has hit its daily loss limit, or open positions need the capital.",
  },
  { name: "History verifier", can: "Grants the verified tier from public Hyperliquid history.", cannot: "Move funds, or change anything except a trader's leverage limit and how many price updates their fills wait for." },
  {
    name: "Buyback executor",
    can: "Chooses when each buyback's share of fees is swapped into its token, and how much price slippage to accept. Each swap has a size cap, and the deployer can replace the executor.",
    cannot: "Spend more than that buyback's own share of the fees, or send them anywhere but that buyback's swap contract.",
  },
  { name: "Sequencer", can: "Puts transactions in order and timestamps them. It can also censor them.", cannot: "Forge a signed price." },
  { name: "Anyone", can: "Settles orders, cancels expired ones and pays IOUs.", cannot: "Change an outcome. Results depend only on the public price record." },
];

/** Shown after "Vault team" when the deployed FeeRouter has a team/ops leg. */
const OPS_ROLE: Role = {
  name: "Team/ops",
  can: "Receives the team/ops share of fees, which the FeeRouter pays to one address fixed at deploy.",
  cannot: "Take more than that share or change where it is paid. It gives no access to the vault.",
};

/**
 * Who has power over Twoprint, and what each of them can and cannot do, including what could go wrong. It opens from the footer
 * and from the "Who do I have to trust?" answer, and starts with the one thing a reader most needs: a price signer posts every
 * price and can see your order.
 */
export function TrustDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { snap, chainId } = useApp();
  const split = snap?.fees.split ?? null;
  const legacy = !!snap && !split; // a router from before the split; while nothing is read yet, the copy stays neutral
  const listed = split && enabledLegs(split.mask).includes(OPS_LEG) ? [...ROLES.slice(0, 3), OPS_ROLE, ...ROLES.slice(3)] : ROLES;
  // The history verifier only exists where an attester is set up: say so where it is not.
  const roles = listed.map((r) => (r.name === "History verifier" && !verifyAvailable(chainId) ? { ...r, can: [...rows(r.can), "It isn't running on this network today."] } : r));

  return (
    <Modal open={open} onClose={onClose} wide title="Who you have to trust" sub="Twoprint relies on a price signer and contract owners. Here is everyone with power over it, what they can and can’t do, and what could go wrong.">
      <ul className="roles">
        {roles.map((r) => (
          <li key={r.name} className="role">
            <h3>{r.name}</h3>
            {rows(r.can).map((t) => (
              <p key={t} data-can>
                <IconCheck aria-hidden="true" />
                <span>{t}</span>
              </p>
            ))}
            {rows(r.cannot).map((t) => (
              <p key={t} data-cannot>
                <IconClose aria-hidden="true" />
                <span>{t}</span>
              </p>
            ))}
          </li>
        ))}
      </ul>
      <div className="roles__holds">
        <h3>What the contracts enforce</h3>
        <ul>
          <li>You never lose more than your collateral, and there is no liquidation fee.</li>
          <li>
            {split ? `Fees you pay go only to ${splitPhrase(split.mask)}.` : legacy ? "Buybacks come only from fees you pay." : "Fees you pay never enter the vault."} The vault&rsquo;s trading profit and loss is kept apart from fees.
          </li>
          <li>Who settles, and when, does not change your fill, your exit, your profit or loss, or your fees.</li>
        </ul>
        <p className="muted">
          Twoprint has not had an external security review. Contract owners retain administrative powers.
          {" In our own replay tests, a strategy using a faster price source made a small profit on BTC, so we don’t claim the fill rule protects the vault from faster traders."}
        </p>
      </div>
    </Modal>
  );
}
