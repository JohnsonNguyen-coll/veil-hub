import { useEffect } from "react";

export function ToastNotification({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const duration = toast.txHash ? 12000 : 6000;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md bg-veil-black border border-veil-purple p-4 shadow-2xl animate-fade-in flex items-start gap-4">
      <div className="w-2 h-2 rounded-full bg-veil-purple mt-2 shrink-0 animate-pulse" />
      <div className="flex-1">
        <span className="font-label-caps text-label-caps text-veil-purple uppercase">{toast.title || "Protocol Event"}</span>
        <p className="font-data-sm text-data-sm text-veil-white mt-1 opacity-90">{toast.message}</p>
        {toast.txHash && (
          <a
            className="inline-flex items-center gap-1 mt-2 font-mono text-xs text-veil-purple underline hover:text-white"
            href={`https://sepolia.etherscan.io/tx/${toast.txHash}`}
            rel="noreferrer"
            target="_blank"
          >
            ↗ View Tx on Sepolia Etherscan ({toast.txHash.slice(0, 10)}...{toast.txHash.slice(-6)})
          </a>
        )}
      </div>
      <button className="font-data-sm text-data-sm text-veil-white opacity-40 hover:opacity-100" onClick={onClose} type="button">
        ✕
      </button>
    </div>
  );
}
