import { PageHeader } from "../components/common/PageHeader.jsx";
import { VeilButton } from "../components/common/VeilButton.jsx";
import { MetricCard, Panel } from "../components/common/Panel.jsx";
import { PoolTable } from "../components/common/Tables.jsx";
import { ActionStack } from "../components/common/Inputs.jsx";

export function DashboardPage({
  activePoolsCount,
  navigatePage,
  nextDraw,
  pools,
  isDecrypted,
  isClaimed,
  userDeposit,
  onDecrypt,
  onFaucet,
  walletBalance
}) {
  return (
    <div>
      <PageHeader
        body="Track your encrypted principal, private winnings, active clubs, and the next no-loss draw without exposing sensitive financial data."
        kicker="Private Terminal"
        title="Your Confidential Position"
        action={
          <div className="flex flex-wrap gap-3">
            <VeilButton onClick={onFaucet} variant="secondary">
              Get Faucet
            </VeilButton>
            <VeilButton onClick={onDecrypt} variant="secondary">
              {isDecrypted ? "Refresh Decrypt" : "Decrypt Balance"}
            </VeilButton>
            <VeilButton onClick={() => navigatePage("global")}>Deposit</VeilButton>
          </div>
        }
      />
      <section className="grid grid-cols-1 md:grid-cols-5 gap-0 border border-veil-gray-light">
        <MetricCard
          label="Wallet cUSDC"
          value={isDecrypted ? `${walletBalance} cUSDC` : "••••••"}
          status={isDecrypted ? "USER_DECRYPTED" : "USER_DECRYPT_ONLY"}
        />
        <MetricCard
          label="Encrypted Principal"
          value={isDecrypted ? `${userDeposit} USDC` : "••••••"}
          status={isDecrypted ? "DECRYPTED_OK" : "USER_DECRYPT_ONLY"}
        />
        <MetricCard
          label="Claimable Winnings"
          value={isDecrypted ? (isClaimed ? "0.00 USDC" : "0.00 USDC") : "••••••"}
          status={isDecrypted ? (isClaimed ? "CLAIMED" : "READY_TO_CLAIM") : "EIP712_REQUIRED"}
        />
        <MetricCard label="Active Pools" value={String(activePoolsCount).padStart(2, "0")} status="ONCHAIN_MEMBERS" />
        <MetricCard label="Next Draw" value={nextDraw || "--"} status={nextDraw === "READY" ? "KEEPER_READY" : "KEEPER_WINDOW"} />
      </section>
      <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8">
        <Panel title="Active Positions">
          <PoolTable rows={pools} />
        </Panel>
        <Panel title="Encrypted Actions">
          <ActionStack />
        </Panel>
      </section>
    </div>
  );
}
