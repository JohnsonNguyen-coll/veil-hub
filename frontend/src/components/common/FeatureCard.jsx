export function FeatureCard({ index, title, description, status, borderClass = "" }) {
  return (
    <div className={`bg-veil-gray-dark p-8 ${borderClass} border-veil-gray-light flex flex-col gap-6 relative min-h-[300px] scramble-hover transition-colors duration-150 border border-transparent hover:border-veil-purple`}>
      <span className="font-data-sm text-data-sm text-veil-white opacity-40 absolute top-6 right-6">{index}</span>
      <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-veil-white font-bold uppercase mt-8 tracking-tight scramble-target" data-original={title}>
        {title}
      </h3>
      <p className="font-body-md text-body-md text-veil-white opacity-70">
        {description}
      </p>
      <div className="mt-auto pt-4 border-t border-veil-gray-light">
        <span className="font-data-sm text-data-sm text-veil-white opacity-80 uppercase">{status}</span>
      </div>
    </div>
  );
}
