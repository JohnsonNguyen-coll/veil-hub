import { useState } from "react";
import { LabelInput, SelectInput } from "./Inputs.jsx";
import { VeilButton } from "./VeilButton.jsx";
import { MetricCard } from "./Panel.jsx";
import { AWAITING_PRIZE_HINT, DRAW_FREQUENCY_OPTIONS, DIRECTORY_VISIBILITY_OPTIONS, DRAW_QUEUED_HINT } from "../../constants/options.js";

export function TransactionForm({ isDecrypted, mode, onDecrypt, onHideBalance, onDeposit, walletBalance }) {
  const [amount, setAmount] = useState("");

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-start">
      <div>
        <LabelInput label="Amount" onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" value={amount} />
        <div className="min-h-[20px] flex flex-wrap items-center gap-2 mt-2 ml-1">
          <p className="font-data-sm text-data-sm text-veil-purple">
            Balance: {isDecrypted && walletBalance != null ? `${walletBalance} cUSDC` : "hidden"}
          </p>
          {isDecrypted ? (
            <button className="font-data-sm text-data-sm text-veil-white underline opacity-70 hover:opacity-100" onClick={onHideBalance} type="button">
              Hide Balance
            </button>
          ) : (
            <button className="font-data-sm text-data-sm text-veil-white underline opacity-70 hover:opacity-100" onClick={onDecrypt} type="button">
              Decrypt Balance
            </button>
          )}
        </div>
      </div>
      <div>
        <LabelInput label="Token" placeholder="cUSDC" value="cUSDC (ERC-7984)" />
        <div className="min-h-[20px] mt-2" />
      </div>
      <div className="flex flex-col">
        <div className="h-[24px] hidden md:block" />
        <VeilButton className="h-[50px]" onClick={() => onDeposit && onDeposit(amount, mode === "global" ? "Global Pool" : "Private Club")}>
          Encrypt Deposit
        </VeilButton>
        <div className="min-h-[20px] mt-2" />
      </div>
      <div className="md:col-span-3 border border-veil-gray-light bg-veil-gray-dark p-4">
        <span className="font-data-sm text-data-sm text-veil-white opacity-70 uppercase">
          &gt; {mode === "global" ? "GLOBAL_POOL" : "PRIVATE_CLUB"} :: amount encrypted client-side, proof submitted onchain
        </span>
      </div>
    </div>
  );
}

export function ClubDetail({ club, isDecrypted, onDecrypt, onHideBalance, onDeposit, walletBalance }) {
  if (!club) {
    return (
      <div className="p-6 border border-veil-gray-light bg-veil-gray-dark text-veil-white opacity-70 font-data-sm">
        No private club selected. Create or join a club below.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-veil-white uppercase">{club.name}</h2>
        <p className="font-data-sm text-data-sm text-veil-white opacity-50 mt-2">admin: {club.admin || "protocol"}</p>
      </div>
      <div className="grid grid-cols-2 gap-0 border border-veil-gray-light">
        <MetricCard label="Encrypted TVL" value={club.tvl || "encrypted"} status="HIDDEN" />
        <MetricCard label="Members" value={club.members || "0"} status="MAY_HIDE" />
        <MetricCard
          hint={club.draw === "DRAW QUEUED" ? DRAW_QUEUED_HINT : club.draw === "AWAITING PRIZE" ? AWAITING_PRIZE_HINT : null}
          label="Draw Cooldown"
          value={club.draw || "--"}
          status={club.drawStatus || (club.drawDue ? "AWAITING_KEEPER" : "KEEPER_WINDOW")}
        />
        <MetricCard label="Prize" value={club.prize || "•••••• USDC"} status="PRIVATE" />
      </div>
      <div className="flex flex-wrap gap-3">
        <VeilButton onClick={() => onDeposit(10)}>Quick Deposit 10 cUSDC</VeilButton>
        <VeilButton onClick={isDecrypted ? onHideBalance : onDecrypt} variant="secondary">
          {isDecrypted ? `Hide Balance ${walletBalance} cUSDC` : "Decrypt Balance"}
        </VeilButton>
        <VeilButton onClick={() => navigator.clipboard && navigator.clipboard.writeText(`VC-${(club.id || "").toUpperCase()}`)} variant="secondary">
          Copy Invite
        </VeilButton>
      </div>
    </div>
  );
}

export function ClubForm({ onCreate }) {
  const [name, setName] = useState("");
  const [minDeposit, setMinDeposit] = useState("25");
  const [drawFrequencyIndex, setDrawFrequencyIndex] = useState("2");
  const [directoryVisibilityIndex, setDirectoryVisibilityIndex] = useState("0");

  const handleSubmit = () => {
    if (onCreate) {
      onCreate({
        name: name || "Secret Vault Club",
        minDeposit,
        drawFrequency: DRAW_FREQUENCY_OPTIONS[Number(drawFrequencyIndex)] || DRAW_FREQUENCY_OPTIONS[2],
        directoryVisibility: DIRECTORY_VISIBILITY_OPTIONS[Number(directoryVisibilityIndex)] || DIRECTORY_VISIBILITY_OPTIONS[0]
      });
      setName("");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <LabelInput label="Club Name" onChange={(e) => setName(e.target.value)} placeholder="Noir Syndicate" value={name} />
      <LabelInput label="Min Deposit" onChange={(e) => setMinDeposit(e.target.value)} placeholder="25 USDC" value={minDeposit} />
      <SelectInput
        label="Draw Frequency"
        onChange={(e) => setDrawFrequencyIndex(e.target.value)}
        options={DRAW_FREQUENCY_OPTIONS.map((option, index) => ({ label: option.label, value: String(index) }))}
        value={drawFrequencyIndex}
      />
      <SelectInput
        label="Directory Visibility"
        onChange={(e) => setDirectoryVisibilityIndex(e.target.value)}
        options={DIRECTORY_VISIBILITY_OPTIONS.map((option, index) => ({ label: option.label, value: String(index) }))}
        value={directoryVisibilityIndex}
      />
      <div className="md:col-span-2">
        <VeilButton onClick={handleSubmit}>Create Encrypted Club</VeilButton>
      </div>
    </div>
  );
}

export function InviteForm({ onJoin }) {
  const [code, setCode] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <LabelInput label="Invite Code" onChange={(e) => setCode(e.target.value)} placeholder="VC-CLUB-01" value={code} />
      <div className="border border-veil-gray-light bg-veil-gray-dark p-4">
        <span className="font-data-sm text-data-sm text-veil-white opacity-70 uppercase">&gt; invite validates membership gate before encrypted deposit</span>
      </div>
      <VeilButton onClick={() => onJoin && onJoin(code)}>Join Club</VeilButton>
    </div>
  );
}
