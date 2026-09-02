import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/common/PageHeader.jsx";
import { Panel } from "../components/common/Panel.jsx";
import { DataCell } from "../components/common/Inputs.jsx";
import { VeilButton } from "../components/common/VeilButton.jsx";
import { ClubDetail, ClubForm, InviteForm } from "../components/common/FormsAndDetails.jsx";

const CLUB_PAGE_SIZE = 5;

export function ClubsPage({ clubs, isDecrypted, onCreateClub, onDecrypt, onHideBalance, onJoinClub, onDeposit, walletBalance }) {
  const directoryClubs = useMemo(() => clubs.filter((pool) => pool.scope === "PRIVATE" && !pool.anonymousMembers), [clubs]);
  const createdClubs = useMemo(
    () => clubs.filter((pool) => pool.scope === "PRIVATE" && pool.joined && pool.membershipSource === "created"),
    [clubs]
  );
  const joinedClubs = useMemo(
    () => clubs.filter((pool) => pool.scope === "PRIVATE" && pool.joined && pool.membershipSource !== "created"),
    [clubs]
  );
  const [activeClubTab, setActiveClubTab] = useState("directory");
  const [clubPages, setClubPages] = useState({ directory: 1, joined: 1, created: 1 });
  const selectableClubs = useMemo(() => {
    const byId = new Map();
    for (const club of [...createdClubs, ...joinedClubs, ...directoryClubs]) {
      byId.set(club.id, { ...(byId.get(club.id) || {}), ...club });
    }
    return [...byId.values()];
  }, [createdClubs, directoryClubs, joinedClubs]);
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

  const clubTabs = [
    { id: "directory", label: "Club Directory", count: directoryClubs.length },
    { id: "joined", label: "Joined Clubs", count: joinedClubs.length },
    { id: "created", label: "Created Clubs", count: createdClubs.length }
  ];
  const activeClubs = activeClubTab === "created" ? createdClubs : activeClubTab === "joined" ? joinedClubs : directoryClubs;
  const activeEmptyMessage = {
    created: "Create a club to list it here",
    joined: "Join by invite or deposit into a club to list it here",
    directory: "No public directory clubs yet"
  }[activeClubTab];
  const pageCount = Math.max(1, Math.ceil(activeClubs.length / CLUB_PAGE_SIZE));
  const activePage = Math.min(clubPages[activeClubTab] || 1, pageCount);
  const pageStart = (activePage - 1) * CLUB_PAGE_SIZE;
  const visibleClubs = activeClubs.slice(pageStart, pageStart + CLUB_PAGE_SIZE);

  useEffect(() => {
    setClubPages((current) => ({
      ...current,
      [activeClubTab]: Math.min(current[activeClubTab] || 1, pageCount)
    }));
  }, [activeClubTab, pageCount]);

  const setActivePage = (updater) => {
    setClubPages((current) => {
      const currentPage = current[activeClubTab] || 1;
      const nextPage = typeof updater === "function" ? updater(currentPage) : updater;
      return {
        ...current,
        [activeClubTab]: Math.min(Math.max(1, nextPage), pageCount)
      };
    });
  };

  return (
    <div>
      <PageHeader
        body="Create or join invitation-only prize pools. Each club has independent encrypted deposits, private odds, keeper-funded prize reserves, and confidential prize claims."
        kicker="Private Pools"
        title="Private Clubs"
      />
      <section className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
        <Panel title="Club Browser">
          <div className="mb-5 flex border border-veil-gray-light" role="tablist">
            {clubTabs.map((tab) => (
              <button
                aria-selected={activeClubTab === tab.id}
                className={`flex-1 px-4 py-3 text-left font-button text-button uppercase transition-colors ${
                  activeClubTab === tab.id ? "bg-veil-purple text-veil-white" : "bg-veil-black text-veil-white hover:bg-veil-gray-dark"
                }`}
                key={tab.id}
                onClick={() => setActiveClubTab(tab.id)}
                role="tab"
                type="button"
              >
                <span>{tab.label}</span>
                <span
                  className={`ml-2 inline-flex min-w-7 items-center justify-center border px-2 py-0.5 text-[11px] leading-none ${
                    activeClubTab === tab.id ? "border-veil-white/40 bg-veil-black/20" : "border-veil-gray-light bg-veil-gray-dark text-veil-white/60"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-col border border-veil-gray-light">
            {visibleClubs.length ? visibleClubs.map(renderClubRow) : emptyState(activeEmptyMessage)}
          </div>
          {pageCount > 1 ? (
            <div className="flex items-center justify-between gap-3 mt-4">
              <VeilButton
                className="px-4 py-2 text-[12px]"
                disabled={activePage === 1}
                onClick={() => setActivePage((current) => current - 1)}
                variant="secondary"
              >
                Prev
              </VeilButton>
              <div className="font-data-sm text-data-sm text-veil-white opacity-50 uppercase">
                Page {activePage} / {pageCount}
              </div>
              <VeilButton
                className="px-4 py-2 text-[12px]"
                disabled={activePage === pageCount}
                onClick={() => setActivePage((current) => current + 1)}
                variant="secondary"
              >
                Next
              </VeilButton>
            </div>
          ) : null}
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
