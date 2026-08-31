export function Panel({ action, children, title }) {
  return (
    <section className="bg-veil-black border border-veil-gray-light">
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-veil-gray-light">
        <span className="font-label-caps text-label-caps text-veil-white opacity-60 uppercase">{title}</span>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function MetricCard({ hint, label, value, status }) {
  return (
    <div className="bg-veil-gray-dark p-6 border-r border-b last:border-r-0 border-veil-gray-light min-h-[132px] min-w-0">
      <span className="font-label-caps text-label-caps text-veil-white opacity-50 uppercase">{label}</span>
      <div className="flex items-center gap-2 font-data-display text-data-display text-veil-white font-bold mt-4 break-words">
        <span>{value}</span>
        {hint ? (
          <span
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-veil-purple text-[12px] leading-none text-veil-purple"
            title={hint}
          >
            !
          </span>
        ) : null}
      </div>
      <div className="font-data-sm text-data-sm text-veil-white opacity-50 uppercase mt-2 break-words">&gt; {status}</div>
    </div>
  );
}
