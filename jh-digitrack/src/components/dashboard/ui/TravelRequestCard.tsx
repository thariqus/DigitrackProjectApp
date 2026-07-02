import React from "react";
import { Plane } from "lucide-react";

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

  const total = statuses.reduce((sum, s) => sum + (counts[s] || 0), 0);

  return (
    <div
      onClick={handleCardClick}
      className="cursor-pointer bg-rose-100/60 backdrop-blur border border-rose-200 rounded-xl shadow-sm p-3 hover:shadow-md transition"
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1.5">
          <Plane size={14} className="text-primary flex-shrink-0 !important" />
          <h3 className="text-sm font-semibold text-primary">{title}</h3>
        </div>
        <span className="text-sm font-bold text-gray-700">{String(total).padStart(2, "0")}</span>
      </div>

      <div className="flex flex-col divide-y divide-rose-200">
        {statuses.map((status) => (
          <div
            key={status}
            onClick={(e) => handleStatusClick(e, status)}
            className="flex justify-between items-center py-1"
          >
            <span className="text-xs text-gray-600">{status}</span>
            <span className="text-xs font-semibold text-gray-800">
              {String(counts[status] || 0).padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
