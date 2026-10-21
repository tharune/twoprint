import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { useApp } from "../app-context";
import { CHAIN_LABEL, DEPLOYMENTS } from "../config/chains";
import { DEV } from "../config/dev";
import { TIER } from "../hooks/data";
import { short, usdc } from "../lib/format";
import { DEV_CONNECTOR_ID, rememberDevAccount } from "../wagmi";
import { IconChevronDown } from "./icons";
import { Badge, Button, CopyButton, Popover } from "./ui";
import { verifyAvailable } from "./VerifyTier";

/** The connect options: a browser wallet, and on the local node the public anvil test key. */
export function ConnectMenu({ block, size = "sm", label = "Connect wallet" }: { block?: boolean; size?: "sm" | "md" | "lg"; label?: string }) {
  const { chainId } = useApp();
  const { connectors, connect, isPending } = useConnect();
  const devConnector = connectors.find((c) => c.id === DEV_CONNECTOR_ID);
  const browserConnector = connectors.find((c) => c.id !== DEV_CONNECTOR_ID);
  const hasInjected = typeof window !== "undefined" && !!(window as unknown as { ethereum?: unknown }).ethereum;
  return (
    <Popover
      label="Connect a wallet"
      align={block ? "left" : "right"}
      trigger={({ open, toggle }) => (
        <Button size={size} block={block} onClick={toggle} aria-expanded={open} aria-haspopup="true" data-pop-trigger>
          {label}
        </Button>
      )}
    >
      {(close) => (
        <>
          <div className="menu-head">
            <strong>Connect a wallet</strong>
            <span>To sign orders on {CHAIN_LABEL[chainId]}</span>
          </div>
          {browserConnector && (
            <button
              type="button"
              className="menu-item"
              disabled={isPending || !hasInjected}
              onClick={() => {
                connect({ connector: browserConnector, chainId });
                close();
              }}
            >
              <span>Browser wallet</span>
              <small>{hasInjected ? "MetaMask, Rabby" : "None detected"}</small>
            </button>
          )}
          {browserConnector && !hasInjected && <p className="menu-note">Install MetaMask or Rabby in this browser, then reload.</p>}
          {DEV && chainId === 31337 && devConnector && (
            <button
              type="button"
              className="menu-item"
              disabled={isPending}
              onClick={() => {
                rememberDevAccount(true);
                connect({ connector: devConnector, chainId: 31337 });
                close();
              }}
            >
              <span>Anvil dev account</span>
              <small>Public test key #3</small>
            </button>
          )}
        </>
      )}
    </Popover>
  );
}

/** Connect button when signed out; account menu (balance, tier, verify, switch network, disconnect) when signed in. */
export function WalletMenu() {
  const { chainId, snap, openVerify } = useApp();
  const { address, connector, chainId: walletChain, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (!isConnected || !address) return <ConnectMenu />;

  const user = snap?.user;
  const tier = user ? TIER[user.tier] : undefined;
  const onDev = DEV && connector?.id === DEV_CONNECTOR_ID;
  const wrongChain = walletChain !== chainId;
  return (
    <Popover
      label="Account"
      trigger={({ open, toggle }) => (
        <button type="button" className="hctl hctl--account" onClick={toggle} aria-expanded={open} aria-haspopup="true" data-pop-trigger>
          {user && <span className="hctl__bal">{usdc(user.usdc, 2)} tUSDC</span>}
          <span className="hctl__addr">{short(address)}</span>
          <IconChevronDown />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="menu-head">
            <strong className="menu-head__addr">
              {short(address)}
              <CopyButton text={address} label="Copy address" />
            </strong>
            <span>{onDev ? "Anvil dev account #3" : connector?.name}</span>
          </div>
          <div className="menu-sep" />
          <div className="menu-row">
            <span>Balance</span>
            <span>{user ? `${usdc(user.usdc, 2)} tUSDC` : "–"}</span>
          </div>
          <div className="menu-row">
            <span>Tier</span>
            {tier ? <Badge tone={tier === "Verified" ? "carbon" : tier === "Flagged" ? "warn" : "neutral"}>{tier}</Badge> : <span>–</span>}
          </div>
          {!!DEPLOYMENTS[chainId] && tier !== "Verified" && verifyAvailable(chainId) && (snap?.pm.maxLevVerified ?? 0) > (snap?.pm.maxLevDefault ?? 0) && (
            <button
              type="button"
              className="menu-item"
              onClick={() => {
                openVerify();
                close();
              }}
            >
              <span>Verify Hyperliquid history</span>
              {snap && <small>Up to {snap.pm.maxLevVerified}x</small>}
            </button>
          )}
          {wrongChain && !onDev && (
            <button
              type="button"
              className="menu-item"
              onClick={() => {
                switchChain({ chainId });
                close();
              }}
            >
              <span>Switch wallet to {CHAIN_LABEL[chainId]}</span>
            </button>
          )}
          {wrongChain && onDev && <p className="menu-note">The anvil dev account signs on the local node only.</p>}
          <div className="menu-sep" />
          <button
            type="button"
            className="menu-item"
            onClick={() => {
              rememberDevAccount(false);
              disconnect();
              close();
            }}
          >
            Disconnect
          </button>
        </>
      )}
    </Popover>
  );
}
