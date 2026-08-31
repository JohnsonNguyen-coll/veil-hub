import { PageHeader } from "../components/common/PageHeader.jsx";
import { VeilButton } from "../components/common/VeilButton.jsx";
import { MetricCard, Panel } from "../components/common/Panel.jsx";
import { TransactionForm } from "../components/common/FormsAndDetails.jsx";
import { DrawEngine } from "../components/common/Inputs.jsx";

export function GlobalPoolPage({ isDecrypted, onDecrypt, onHideBalance, onDeposit, pool, walletBalance }) {
  return (
    <div>
      <PageHeader
        body="The public entry pool for onboarding. Anyone can deposit encrypted cUSDC and join confidential prize draws without exposing balances."
        kicker="Public Pool"
        title="Global No-Loss Pool"
        action={
          <div className="flex flex-wrap gap-3">
            <VeilButton onClick={() => onDeposit(10, "Global Pool")}>Quick Deposit 10 cUSDC</VeilButton>
          </div>
        }
      />
      <section className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-veil-gray-light mb-8">
        <MetricCard label="Encrypted TVL" value={pool?.tvl || "encrypted"} status="TOTAL_HIDDEN" />
        <MetricCard label="Members" value={pool?.members || "0"} status="PUBLIC_COUNT" />
        <MetricCard label="Yield Strategy" value="ONCHAIN" status="CONFIG_REQUIRED" />
        <MetricCard label="Prize" value="••••••" status="WINNER_DECRYPTS" />
      </section>
      <section className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
        <Panel title="Deposit Flow">
          <TransactionForm
            isDecrypted={isDecrypted}
            mode="global"
            onDecrypt={onDecrypt}
            onHideBalance={onHideBalance}
            onDeposit={onDeposit}
            walletBalance={walletBalance}
          />
        </Panel>
        <Panel title="Draw Engine">
          <DrawEngine />
        </Panel>
      </section>
    </div>
  );
}
