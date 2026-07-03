import { LucideIcon } from "lucide-react";

const statuses = ["Open", "In Progress", "Completed", "Canceled"];

type StatusData = {
  count: number;
  ages?: { label: string; count: number }[];
};

export const TaskCard = ({
  title,
  filterKey,
  counts = {},
  icon: Icon,
}: {
  title: string;
  filterKey: string;
  counts?: { [status: string]: StatusData };
  icon?: LucideIcon;
}) => {
  const handleClick = () => {
    window.location.href = `/jh-digitrack/tasks?filter=${filterKey}`;
  };

  const total = statuses.reduce(
    (sum, status) => sum + (counts?.[status]?.count || 0),
    0
  );

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer bg-rose-100/60 backdrop-blur border border-rose-200 rounded-xl shadow-sm p-3 hover:shadow-md transition"
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon size={14} className="text-primary flex-shrink-0 !important" />}
          <h3 className="text-sm font-semibold text-primary">{title}</h3>
        </div>
        <span className="text-sm font-bold text-gray-700">{String(total).padStart(2, "0")}</span>
      </div>

      <div className="flex flex-col divide-y divide-rose-200">
        {statuses.map((status) => (
          <div key={status} className="flex justify-between items-center py-1">
            <span className="text-xs text-gray-600">{status}</span>
            <span className="text-xs font-semibold text-gray-800">
              {String(counts?.[status]?.count || 0).padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
