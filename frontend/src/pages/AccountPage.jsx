import { useState } from "react";
import { PageHeader } from "../components/common/PageHeader.jsx";
import { VeilButton, ConnectWalletButton } from "../components/common/VeilButton.jsx";
import { MetricCard, Panel } from "../components/common/Panel.jsx";
import { ActionStack, LabelInput } from "../components/common/Inputs.jsx";

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
  onUnwrap,
  onWithdraw,
  walletBalance
}) {
  const [unwrapAmount, setUnwrapAmount] = useState("");

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
              value={isDecrypted ? `${walletBalance} cUSDC` : "••••••"}
              status={isDecrypted ? "DECRYPTED" : "CLICK_DECRYPT"}
            />
            <MetricCard
              label="Global Balance"
              value={isDecrypted ? `${userDeposit} cUSDC` : "••••••"}
              status={isDecrypted ? "DECRYPTED" : "CLICK_DECRYPT"}
            />
            <MetricCard
              label="Club Balance"
              value={isDecrypted ? "0.00 cUSDC" : "••••••"}
              status={isDecrypted ? "DECRYPTED" : "CLICK_DECRYPT"}
            />
            <MetricCard
              label="Pending Prize"
              value={isDecrypted ? `${pendingPrize} cUSDC` : "••••••"}
              status={pendingPrizeDraw ? "READY_TO_CLAIM" : isClaimed ? "CLAIMED" : "NO_PENDING_PRIZE"}
            />
            <MetricCard
              label="Odds"
              value={isDecrypted ? "0.0%" : "••••••"}
              status="CONFIDENTIAL"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
            <VeilButton onClick={onDecrypt}>
              {isDecrypted ? "Re-decrypt Balance" : "Decrypt Balance"}
            </VeilButton>
            <VeilButton disabled={!pendingPrizeDraw || isClaimed} onClick={onClaim} variant="secondary">
              {isClaimed ? "Prize Claimed" : pendingPrizeDraw ? "Claim Draw" : "No Prize To Claim"}
            </VeilButton>
            <VeilButton disabled={userDeposit <= 0} onClick={onWithdraw} variant="secondary">
              Withdraw Principal
            </VeilButton>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <VeilButton onClick={onFaucet} variant="secondary">
              Get Faucet 100 cUSDC
            </VeilButton>
            {isDecrypted ? (
              <VeilButton onClick={onHideBalance} variant="secondary">
                Hide Balance
              </VeilButton>
            ) : null}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 mt-6">
            <LabelInput
              label="Unwrap Amount"
              onChange={(event) => setUnwrapAmount(event.target.value)}
              placeholder="Enter amount"
              value={unwrapAmount}
            />
            <VeilButton
              className="self-end"
              disabled={!isDecrypted || Number(unwrapAmount) <= 0}
              onClick={() => onUnwrap(unwrapAmount)}
              variant="secondary"
            >
              Unwrap cUSDC
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
