import { ConnectButton } from "@rainbow-me/rainbowkit";

export function VeilButton({ children, disabled = false, onClick, variant = "primary", className = "" }) {
  const variantClass =
    variant === "secondary"
      ? "bg-transparent text-veil-white border border-veil-gray-light hover:bg-veil-gray-dark"
      : "bg-veil-purple text-veil-white border border-veil-purple hover:bg-opacity-90";

  return (
    <button
      className={`${variantClass} font-data-sm text-[13px] md:text-[14px] font-bold tracking-wider px-6 md:px-7 py-3 md:py-3.5 uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function ConnectWalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
        const connected = mounted && account && chain;

        if (!connected) {
          return <VeilButton onClick={openConnectModal}>Connect Wallet</VeilButton>;
        }

        if (chain.unsupported) {
          return <VeilButton onClick={openChainModal}>Wrong Network</VeilButton>;
        }

        return <VeilButton onClick={openAccountModal}>{account.displayName}</VeilButton>;
      }}
    </ConnectButton.Custom>
  );
}
