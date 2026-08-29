import { PageHeader } from "../components/common/PageHeader.jsx";
import { Panel } from "../components/common/Panel.jsx";
import { DataTable } from "../components/common/Tables.jsx";
import { PrivacyList } from "../components/common/Inputs.jsx";

function shortHash(value) {
  if (!value || value === "encrypted") return value || "--";
  return `${String(value).slice(0, 10)}...${String(value).slice(-6)}`;
}

export function DrawsPage({ draws }) {
  const rows = draws.map((draw) => [
    `#${draw.drawNumber}`,
    draw.clubName || `Club ${draw.clubId}`,
    draw.winner || "winner-decrypts",
    shortHash(draw.prizeHandle),
    draw.txHash ? `${draw.status} ${shortHash(draw.txHash)}` : draw.status
  ]);

  return (
    <div>
      <PageHeader
        body="Draws execute onchain over confidential pool state. The frontend only receives public events and ciphertext handles until an authorized user decrypts."
        kicker="Prize Draw"
        title="Confidential Draw History"
      />
      <section className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        <Panel title="Recent Draws">
          <DataTable
            columns={["draw", "pool", "winner", "prize handle", "status"]}
            rows={rows}
          />
        </Panel>
        <Panel title="Privacy Surface">
          <PrivacyList />
        </Panel>
      </section>
    </div>
  );
}
