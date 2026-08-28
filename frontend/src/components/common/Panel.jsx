export function Panel({ children, title }) {
  return (
    <section className="bg-veil-black border border-veil-gray-light">
      <div className="px-5 py-4 border-b border-veil-gray-light">
        <span className="font-label-caps text-label-caps text-veil-white opacity-60 uppercase">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function MetricCard({ label, value, status }) {
  return (
    <div className="bg-veil-gray-dark p-6 border-r border-b last:border-r-0 border-veil-gray-light min-h-[132px] min-w-0">
      <span className="font-label-caps text-label-caps text-veil-white opacity-50 uppercase">{label}</span>
      <div className="font-data-display text-data-display text-veil-white font-bold mt-4 break-words">{value}</div>
      <div className="font-data-sm text-data-sm text-veil-white opacity-50 uppercase mt-2 break-words">&gt; {status}</div>
    </div>
  );
}
