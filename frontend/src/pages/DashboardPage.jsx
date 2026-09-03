import { PageHeader } from "../components/common/PageHeader.jsx";
import { VeilButton } from "../components/common/VeilButton.jsx";
import { MetricCard, Panel } from "../components/common/Panel.jsx";
import { PoolTable } from "../components/common/Tables.jsx";
import { ActionStack } from "../components/common/Inputs.jsx";
import { AWAITING_PRIZE_HINT, DRAW_QUEUED_HINT } from "../constants/options.js";

export function DashboardPage({
  activePoolsCount,
  navigatePage,
  nextDraw,
  pools,
  isDecrypted,
  isClaimed,
  userDeposit,
  nextDrawStatus,
  onDecrypt,
  onFaucet,
  pendingPrize,
  walletBalance
}) {
  const hasClaimablePrize = isDecrypted && !isClaimed && Number(pendingPrize || 0) > 0;
  const claimableWinnings = isDecrypted ? `${isClaimed ? "0.00" : pendingPrize || "0.00"} cUSDC` : "••••••";
  const claimableStatus = isDecrypted
    ? isClaimed
      ? "CLAIMED"
      : hasClaimablePrize
        ? "PRIZE_READY"
        : "NO_PENDING_PRIZE"
    : "EIP712_REQUIRED";

  return (
    <div>
      <PageHeader
        body="Track your encrypted principal, private winnings, active clubs, and the next no-loss draw without exposing sensitive financial data."
        kicker="Private Terminal"
        title="Your Confidential Position"
        action={
          <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3 w-full md:w-auto">
            <VeilButton className="h-12 min-w-[128px] px-5 !py-0 md:!py-0" onClick={() => navigatePage("global")}>
              Deposit
            </VeilButton>
            <VeilButton className="h-12 min-w-[128px] px-5 !py-0 md:!py-0 whitespace-nowrap" onClick={onDecrypt} variant="secondary">
              {isDecrypted ? "Refresh Decrypt" : "Decrypt Balance"}
            </VeilButton>
            <VeilButton className="h-12 min-w-[128px] px-5 !py-0 md:!py-0" onClick={onFaucet} variant="secondary">
              Get Faucet
            </VeilButton>
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
          value={isDecrypted ? `${userDeposit} cUSDC` : "••••••"}
          status={isDecrypted ? "DECRYPTED_OK" : "USER_DECRYPT_ONLY"}
        />
        <MetricCard
          label="Claimable Winnings"
          value={claimableWinnings}
          status={claimableStatus}
        />
        <MetricCard label="Active Pools" value={String(activePoolsCount).padStart(2, "0")} status="ONCHAIN_MEMBERS" />
        <MetricCard
          hint={nextDraw === "DRAW QUEUED" ? DRAW_QUEUED_HINT : nextDraw === "AWAITING PRIZE" ? AWAITING_PRIZE_HINT : null}
          label="Next Draw"
          value={nextDraw || "--"}
          status={nextDrawStatus || "KEEPER_WINDOW"}
        />
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
