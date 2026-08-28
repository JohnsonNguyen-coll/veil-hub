import { useState } from "react";
import { PageHeader } from "../components/common/PageHeader.jsx";
import { Panel } from "../components/common/Panel.jsx";
import { DataCell } from "../components/common/Inputs.jsx";
import { ClubDetail, ClubForm, InviteForm } from "../components/common/FormsAndDetails.jsx";

export function ClubsPage({ clubs, isDecrypted, onCreateClub, onDecrypt, onHideBalance, onJoinClub, onDeposit, walletBalance }) {
  const privateClubs = clubs.filter((pool) => pool.scope === "PRIVATE");
  const [selectedClub, setSelectedClub] = useState(privateClubs[0] || clubs[0]);

  return (
    <div>
      <PageHeader
        body="Create or join invitation-only prize pools. Each club has independent encrypted deposits, private odds, yield routing, and confidential prize claims."
        kicker="Social Yield"
        title="Private Clubs"
      />
      <section className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
        <Panel title="Club Directory">
          <div className="flex flex-col border border-veil-gray-light">
            {privateClubs.map((club) => (
              <button
                className={`grid grid-cols-2 md:grid-cols-[1fr_120px_120px] gap-4 text-left p-5 border-b last:border-b-0 border-veil-gray-light hover:bg-veil-gray-dark transition-colors ${
                  selectedClub?.id === club.id ? "bg-veil-gray-dark" : ""
                }`}
                key={club.id}
                onClick={() => setSelectedClub(club)}
                type="button"
              >
                <div>
                  <span className="font-headline-lg-mobile text-headline-lg-mobile text-veil-white uppercase">{club.name}</span>
                  <p className="font-data-sm text-data-sm text-veil-white opacity-50 mt-2">invite: VC-{club.id.toUpperCase()}</p>
                </div>
                <DataCell label="members" value={club.members} />
                <DataCell label="draw" value={club.draw} />
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="Selected Club">
          <ClubDetail
            club={selectedClub}
            isDecrypted={isDecrypted}
            onDecrypt={onDecrypt}
            onHideBalance={onHideBalance}
            onDeposit={(amt) => onDeposit(amt, selectedClub?.name || "Private Club", selectedClub?.contractId || 0n)}
            walletBalance={walletBalance}
          />
        </Panel>
      </section>
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
        <Panel title="Create Private Club">
          <ClubForm onCreate={onCreateClub} />
        </Panel>
        <Panel title="Join By Invite">
          <InviteForm onJoin={onJoinClub} />
        </Panel>
      </section>
    </div>
  );
}
