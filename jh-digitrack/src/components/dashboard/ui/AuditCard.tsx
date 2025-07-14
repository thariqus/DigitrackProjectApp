import { StatusCard } from "./StatusCard";

export const AuditCard = ({
  title,
  filterKey,
  count = 0,
}: {
  title: string;
  filterKey: string;
  count?: number;
}) => {
  const handleClick = () => {
    window.location.href = `/jh-digitrack/audits?filter=${filterKey}`;
  };

  return (
    <div
      onClick={handleClick}
      className="relative cursor-pointer bg-rose-100/60 backdrop-blur border border-rose-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition"
    >
      <div className="absolute top-3 right-3 bg-rose-200 text-sm font-semibold text-gray-800 px-3 py-1 rounded-full shadow-sm">
        Total: {count}
      </div>

      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
        <StatusCard status="Open" count={count} />
      </div>
    </div>
  );
};
