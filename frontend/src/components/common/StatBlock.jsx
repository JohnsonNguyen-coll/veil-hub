export function StatBlock({ label, value, status }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-label-caps text-label-caps text-veil-white opacity-60 uppercase">{label}</span>
      <span className="font-data-display text-data-display text-veil-white font-bold">{value}</span>
      {status ? <span className="font-data-sm text-data-sm text-veil-white opacity-50 uppercase">&gt; {status}</span> : null}
    </div>
  );
}
