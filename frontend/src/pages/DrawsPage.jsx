import { PageHeader } from "../components/common/PageHeader.jsx";
import { Panel } from "../components/common/Panel.jsx";
import { DataTable } from "../components/common/Tables.jsx";
import { PrivacyList } from "../components/common/Inputs.jsx";

export function DrawsPage({ draws }) {
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
            rows={draws}
          />
        </Panel>
        <Panel title="Privacy Surface">
          <PrivacyList />
        </Panel>
      </section>
    </div>
  );
}
