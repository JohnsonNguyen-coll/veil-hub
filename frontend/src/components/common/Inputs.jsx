import { useEffect, useRef, useState } from "react";

export function LabelInput({ inputMode, label, min, onChange, placeholder, step, type = "text", value }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-label-caps text-label-caps text-veil-white opacity-50 uppercase">{label}</span>
      <input
        className="bg-veil-gray-dark border border-veil-gray-light text-veil-white font-data-sm text-data-sm px-4 py-4 focus:border-veil-purple focus:ring-0"
        inputMode={inputMode}
        min={min}
        onChange={onChange}
        placeholder={placeholder}
        step={step}
        type={type}
        value={value}
      />
    </label>
  );
}

export function SelectInput({ label, options, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (nextValue) => {
    onChange?.({ target: { value: nextValue } });
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-2" ref={dropdownRef}>
      <span className="font-label-caps text-label-caps text-veil-white opacity-50 uppercase">{label}</span>
      <span className="relative block">
        <button
          aria-expanded={isOpen}
          className={`h-10 w-full bg-veil-gray-dark border text-veil-white font-data-sm text-data-sm px-4 pr-10 text-left uppercase outline-none transition-colors hover:border-veil-purple focus:border-veil-purple focus:ring-1 focus:ring-veil-purple ${
            isOpen ? "border-veil-purple ring-1 ring-veil-purple" : "border-veil-gray-light"
          }`}
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          {selectedOption?.label || "Select"}
        </button>
        <span
          className={`pointer-events-none absolute right-4 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-b-2 border-r-2 border-veil-white opacity-50 transition-transform ${
            isOpen ? "rotate-[225deg]" : ""
          }`}
        />
        {isOpen ? (
          <div className="absolute left-0 right-0 top-[calc(100%+2px)] z-30 border border-veil-gray-light bg-veil-black shadow-[0_14px_40px_rgba(0,0,0,0.45)]">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  className={`block w-full px-4 py-2 text-left font-data-sm text-data-sm uppercase transition-colors hover:bg-veil-purple hover:text-veil-white ${
                    isSelected ? "bg-veil-purple text-veil-white" : "text-veil-white"
                  }`}
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </span>
    </div>
  );
}

export function DataCell({ label, value }) {
  return (
    <div>
      <span className="font-label-caps text-label-caps text-veil-white opacity-40 uppercase">{label}</span>
      <p className="font-data-sm text-data-sm text-veil-white mt-2">{value}</p>
    </div>
  );
}

export function ActionStack() {
  const actions = ["FAUCET_READY", "ENCRYPT_INPUT_PENDING", "USER_DECRYPT_AVAILABLE", "NO_LOSS_WITHDRAW_ENABLED"];

  return (
    <div className="flex flex-col border border-veil-gray-light">
      {actions.map((action) => (
        <div className="flex items-center justify-between gap-4 p-4 border-b last:border-b-0 border-veil-gray-light" key={action}>
          <span className="font-data-sm text-data-sm text-veil-white uppercase">• {action}</span>
          <svg className="w-4 h-4 text-veil-white opacity-60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      ))}
    </div>
  );
}

export function PrivacyList() {
  return (
    <div className="flex flex-col gap-4">
      {[
        ["Hidden", "Member balances, total club capital, odds, and prize amounts"],
        ["Public", "Draw events, pool address, optional winner address, timestamps"],
        ["User-only", "Own balance and winnings after EIP-712 user decrypt"],
        ["FHE Kernel", "Onchain verifiable random winner selection in ciphertext"]
      ].map(([label, body]) => (
        <div className="border border-veil-gray-light bg-veil-gray-dark p-4" key={label}>
          <span className="font-label-caps text-label-caps text-veil-purple uppercase">{label}</span>
          <p className="font-body-md text-body-md text-veil-white opacity-70 mt-2">{body}</p>
        </div>
      ))}
    </div>
  );
}

export function DrawEngine() {
  const steps = [
    ["01", "Prepare aggregate total", "Keeper opens only the encrypted TVL handle for KMS proof"],
    ["02", "Verify total proof", "Contract verifies Zama KMS signatures before drawing"],
    ["03", "Weighted ciphertext draw", "Random threshold is compared with encrypted principal buckets"],
    ["04", "Winner decrypts prize", "Only the winning encrypted prize handle is user-decryptable"]
  ];

  return (
    <div className="flex flex-col border border-veil-gray-light">
      {steps.map(([number, title, body]) => (
        <div className="grid grid-cols-[56px_1fr] gap-4 p-4 border-b last:border-b-0 border-veil-gray-light" key={number}>
          <span className="font-data-sm text-data-sm text-veil-purple">{number}</span>
          <div>
            <p className="font-data-sm text-data-sm text-veil-white uppercase">{title}</p>
            <p className="font-body-md text-body-md text-veil-white opacity-60 mt-1">{body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
