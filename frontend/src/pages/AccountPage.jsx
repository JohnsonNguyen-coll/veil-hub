import { PageHeader } from "../components/common/PageHeader.jsx";
import { VeilButton, ConnectWalletButton } from "../components/common/VeilButton.jsx";
import { MetricCard, Panel } from "../components/common/Panel.jsx";
import { ActionStack } from "../components/common/Inputs.jsx";

export function AccountPage({
  isDecrypted,
  isClaimed,
  pendingPrize,
  pendingPrizeDraw,
  userDeposit,
  onDecrypt,
  onClaim,
  onFaucet,
  onHideBalance,
  onWithdraw,
  walletBalance
}) {
  return (
    <div>
      <PageHeader
        body="Your wallet controls decryption. Balances, winnings, and odds remain ciphertext until you request an EIP-712 user decrypt."
        kicker="Wallet Console"
        title="Account And Claims"
        action={<ConnectWalletButton />}
      />
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Decrypt Center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-veil-gray-light">
            <MetricCard
              label="Wallet cUSDC"
              value={isDecrypted ? `${walletBalance} USDC` : "••••••"}
              status={isDecrypted ? "DECRYPTED" : "CLICK_DECRYPT"}
            />
            <MetricCard
              label="Global Balance"
              value={isDecrypted ? `${userDeposit} USDC` : "••••••"}
              status={isDecrypted ? "DECRYPTED" : "CLICK_DECRYPT"}
            />
            <MetricCard
              label="Club Balance"
              value={isDecrypted ? "0.00 USDC" : "••••••"}
              status={isDecrypted ? "DECRYPTED" : "CLICK_DECRYPT"}
            />
            <MetricCard
              label="Pending Prize"
              value={isDecrypted ? `${pendingPrize} USDC` : "••••••"}
              status={pendingPrizeDraw ? `DRAW_${pendingPrizeDraw.drawNumber}` : isClaimed ? "CLAIMED" : "NO_PENDING_PRIZE"}
            />
            <MetricCard
              label="Odds"
              value={isDecrypted ? "0.0%" : "••••••"}
              status="CONFIDENTIAL"
            />
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            <VeilButton onClick={onFaucet} variant="secondary">
              Get Faucet 100 cUSDC
            </VeilButton>
            <VeilButton onClick={onDecrypt}>
              {isDecrypted ? "Re-decrypt Balance" : "Decrypt Balance"}
            </VeilButton>
            {isDecrypted ? (
              <VeilButton onClick={onHideBalance} variant="secondary">
                Hide Balance
              </VeilButton>
            ) : null}
            <VeilButton disabled={!pendingPrizeDraw || isClaimed} onClick={onClaim} variant="secondary">
              {isClaimed ? "Prize Claimed" : pendingPrizeDraw ? `Claim Draw #${pendingPrizeDraw.drawNumber}` : "No Prize To Claim"}
            </VeilButton>
            <VeilButton disabled={userDeposit <= 0} onClick={onWithdraw} variant="secondary">
              Withdraw Principal
            </VeilButton>
          </div>
        </Panel>
        <Panel title="Transaction Queue">
          <ActionStack />
        </Panel>
      </section>
    </div>
  );
}
