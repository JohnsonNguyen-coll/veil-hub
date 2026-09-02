import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/common/PageHeader.jsx";
import { Panel } from "../components/common/Panel.jsx";
import { DataCell } from "../components/common/Inputs.jsx";
import { ClubDetail, ClubForm, InviteForm } from "../components/common/FormsAndDetails.jsx";

export function ClubsPage({ clubs, isDecrypted, onCreateClub, onDecrypt, onHideBalance, onJoinClub, onDeposit, walletBalance }) {
  const directoryClubs = useMemo(() => clubs.filter((pool) => pool.scope === "PRIVATE" && !pool.anonymousMembers), [clubs]);
  const joinedClubs = useMemo(() => clubs.filter((pool) => pool.scope === "PRIVATE" && pool.joined), [clubs]);
  const selectableClubs = useMemo(() => {
    const byId = new Map();
    for (const club of [...joinedClubs, ...directoryClubs]) byId.set(club.id, { ...(byId.get(club.id) || {}), ...club });
    return [...byId.values()];
  }, [directoryClubs, joinedClubs]);
  const [selectedClub, setSelectedClub] = useState(selectableClubs[0] || null);

  useEffect(() => {
    setSelectedClub((current) => {
      const currentId = current?.id;
      return selectableClubs.find((club) => club.id === currentId) || selectableClubs[0] || null;
    });
  }, [selectableClubs]);

  const renderClubRow = (club) => (
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
        <p className="font-data-sm text-data-sm text-veil-white opacity-50 mt-2">
          {club.anonymousMembers ? `invite: ${club.inviteCode || "private"}` : "directory: public"}
        </p>
      </div>
      <DataCell label="members" value={club.members} />
      <DataCell label="cooldown" value={club.draw || "--"} />
    </button>
  );

  const emptyState = (message) => (
    <div className="border border-veil-gray-light px-5 py-6 font-data-sm text-data-sm text-veil-white opacity-60 uppercase">
      &gt; {message}
    </div>
  );

  return (
    <div>
      <PageHeader
        body="Create or join invitation-only prize pools. Each club has independent encrypted deposits, private odds, keeper-funded prize reserves, and confidential prize claims."
        kicker="Private Pools"
        title="Private Clubs"
      />
      <section className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
        <div className="flex flex-col gap-6">
          <Panel title="Club Directory">
            <div className="flex flex-col border border-veil-gray-light">
              {directoryClubs.length ? directoryClubs.map(renderClubRow) : emptyState("No public directory clubs yet")}
            </div>
          </Panel>
          <Panel title="Joined Clubs">
            <div className="flex flex-col border border-veil-gray-light">
              {joinedClubs.length ? joinedClubs.map(renderClubRow) : emptyState("Deposit, join by invite, or create a club to list it here")}
            </div>
          </Panel>
        </div>
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
