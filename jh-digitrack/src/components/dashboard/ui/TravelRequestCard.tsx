import { StatusCard } from "./StatusCard";

const statuses = ["Approval Pending", "Urgent", "Reconfirmation Pending"];

export const TravelRequestCard = ({
  title,
  counts = {},
}: {
  title: string;
  filterKey: string;
  counts?: { [status: string]: number };
}) => {
  const handleCardClick = () => {
    window.location.href = `/app/jh-travel-request/view/list?request_status=`;
  };

  const handleStatusClick = (e: React.MouseEvent, status: string) => {
    e.stopPropagation(); 
    const statusParam = encodeURIComponent(status);
    window.location.href = `/app/jh-travel-request/view/list?request_status=${statusParam}`;
  };

  const total =
    (counts["Approval Pending"] || 0) +
    (counts["Urgent"] || 0) +
    (counts["Reconfirmation Pending"] || 0);

  return (
    <div
      onClick={handleCardClick}
      className="relative cursor-pointer bg-rose-100/60 backdrop-blur border border-rose-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition"
    >
      <div className="absolute top-3 right-3 bg-rose-200 text-sm font-semibold text-gray-800 px-3 py-1 rounded-full shadow-sm">
        Total: {total}
      </div>

      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statuses.map((status) => (
          <div
            key={status}
            onClick={(e) => handleStatusClick(e, status)}
            className="cursor-pointer"
          >
            <StatusCard
              status={status}
              count={counts?.[status] || 0}
              type="travel"
            />
          </div>
        ))}
      </div>
    </div>
  );
};



