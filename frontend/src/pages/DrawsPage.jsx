import { useMemo, useState } from "react";
import { PageHeader } from "../components/common/PageHeader.jsx";
import { Panel } from "../components/common/Panel.jsx";
import { DataTable } from "../components/common/Tables.jsx";
import { PrivacyList } from "../components/common/Inputs.jsx";
import { VeilButton } from "../components/common/VeilButton.jsx";

const DRAW_PAGE_SIZE = 8;

function shortHash(value) {
  if (!value || value === "encrypted") return value || "--";
  return `${String(value).slice(0, 10)}...${String(value).slice(-6)}`;
}

export function DrawsPage({ draws }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(draws.length / DRAW_PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * DRAW_PAGE_SIZE;
  const rows = useMemo(
    () =>
      draws.slice(pageStart, pageStart + DRAW_PAGE_SIZE).map((draw) => [
        `#${draw.drawNumber}`,
        draw.clubName || `Club ${draw.clubId}`,
        draw.winner || "winner-decrypts",
        shortHash(draw.prizeHandle),
        draw.txHash ? `${draw.status} ${shortHash(draw.txHash)}` : draw.status
      ]),
    [draws, pageStart]
  );

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
          {pageCount > 1 ? (
            <div className="flex items-center justify-between gap-3 mt-4">
              <VeilButton
                className="px-4 py-2 text-[12px]"
                disabled={safePage === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                variant="secondary"
              >
                Prev
              </VeilButton>
              <div className="font-data-sm text-data-sm text-veil-white opacity-50 uppercase">
                Page {safePage} / {pageCount}
              </div>
              <VeilButton
                className="px-4 py-2 text-[12px]"
                disabled={safePage === pageCount}
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                variant="secondary"
              >
                Next
              </VeilButton>
            </div>
          ) : null}
        </Panel>
        <Panel title="Privacy Surface">
          <PrivacyList />
        </Panel>
      </section>
    </div>
  );
}
