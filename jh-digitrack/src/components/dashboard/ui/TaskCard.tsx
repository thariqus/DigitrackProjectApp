import { StatusCard } from "./StatusCard";

const statuses = ["Open", "In Progress"];

type AgeData = {
  age_in_days: number;
  count: number;
};

type StatusData = {
  count: number;
  ages?: AgeData[];
};

export const TaskCard = ({
  title,
  filterKey,
  counts = {},
}: {
  title: string;
  filterKey: string;
  counts?: {
    [status: string]: StatusData;
  };
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
      className="relative cursor-pointer bg-rose-100/60 backdrop-blur border border-rose-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition"
    >
      <div className="absolute top-3 right-3 bg-rose-200 text-sm font-semibold text-gray-800 px-3 py-1 rounded-full shadow-sm">
        Total: {total}
      </div>

      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {statuses.map((status) => (
          <StatusCard
            key={status}
            status={status}
            count={counts?.[status]?.count || 0}
            ages={counts?.[status]?.ages || []}
            type="task"
          />
        ))}
      </div>
    </div>
  );
};
