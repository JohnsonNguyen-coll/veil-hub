import { AWAITING_PRIZE_HINT, DRAW_QUEUED_HINT } from "../../constants/options.js";

function DrawValue({ value }) {
  const hint = value === "DRAW QUEUED" ? DRAW_QUEUED_HINT : value === "AWAITING PRIZE" ? AWAITING_PRIZE_HINT : null;
  if (!hint) return value;

  return (
    <span className="inline-flex items-center gap-2" title={hint}>
      <span>{value}</span>
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-veil-purple text-[10px] leading-none text-veil-purple">
        !
      </span>
    </span>
  );
}

export function PoolTable({ rows }) {
  return (
    <div className="overflow-x-auto border border-veil-gray-light">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr className="bg-veil-gray-dark">
            {["pool", "scope", "encrypted tvl", "members", "next draw", "status"].map((column) => (
              <th className="font-label-caps text-label-caps text-veil-white opacity-50 uppercase text-left p-4 border-b border-veil-gray-light" key={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="hover:bg-veil-gray-dark transition-colors" key={row.id}>
              <td className="font-data-sm text-data-sm text-veil-white p-4 border-b border-veil-gray-light uppercase">{row.name}</td>
              <td className="font-data-sm text-data-sm text-veil-white opacity-70 p-4 border-b border-veil-gray-light">{row.scope}</td>
              <td className="font-data-sm text-data-sm text-veil-white p-4 border-b border-veil-gray-light">{row.tvl}</td>
              <td className="font-data-sm text-data-sm text-veil-white p-4 border-b border-veil-gray-light">{row.members}</td>
              <td className="font-data-sm text-data-sm text-veil-white p-4 border-b border-veil-gray-light">
                <DrawValue value={row.draw} />
              </td>
              <td className="font-data-sm text-data-sm text-veil-white p-4 border-b border-veil-gray-light">&gt; {row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DataTable({ columns, rows }) {
  return (
    <div className="overflow-x-auto border border-veil-gray-light">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr className="bg-veil-gray-dark">
            {columns.map((column) => (
              <th className="font-label-caps text-label-caps text-veil-white opacity-50 uppercase text-left p-4 border-b border-veil-gray-light" key={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="hover:bg-veil-gray-dark transition-colors" key={row[0]}>
              {row.map((cell) => (
                <td className="font-data-sm text-data-sm text-veil-white p-4 border-b border-veil-gray-light" key={cell}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
