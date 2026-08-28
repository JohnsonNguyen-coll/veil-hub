export function StatusDot({ label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 bg-green-500 rounded-full pulse-green"></span>
      <span className="font-data-sm text-data-sm text-veil-white font-bold uppercase">{label}</span>
    </div>
  );
}
