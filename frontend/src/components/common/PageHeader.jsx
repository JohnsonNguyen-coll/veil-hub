export function PageHeader({ kicker, title, body, action }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
      <div className="max-w-3xl">
        <span className="font-label-caps text-label-caps text-veil-purple uppercase">{kicker}</span>
        <h1 className="font-headline-lg text-headline-lg text-veil-white uppercase mt-3">{title}</h1>
        <p className="font-body-md text-body-md text-veil-white opacity-70 mt-3">{body}</p>
      </div>
      {action}
    </div>
  );
}
