import React from "react";
import { Plane } from "lucide-react";

export const TravelRequestCard = ({
  title,
  counts = {},
}: {
  title: string;
  filterKey: string;
  counts?: { pending_on_me?: number; created_by_me?: { total?: number; completed?: number } };
}) => {
  const pendingOnMe = counts.pending_on_me || 0;
  const createdByMeTotal = counts.created_by_me?.total || 0;
  const createdByMeCompleted = counts.created_by_me?.completed || 0;

  const handleCardClick = () => {
    window.location.href = `/app/jh-travel-request/view/list`;
  };

  const handleStatusClick = (e: React.MouseEvent, requestStatus?: string) => {
    e.stopPropagation();
    if (!requestStatus) {
      window.location.href = `/app/jh-travel-request/view/list`;
      return;
    }
    const statusParam = encodeURIComponent(requestStatus);
    window.location.href = `/app/jh-travel-request/view/list?request_status=${statusParam}`;
  };

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
        <span className="text-sm font-bold text-gray-700">{String(pendingOnMe).padStart(2, "0")}</span>
      </div>

      <div className="flex flex-col divide-y divide-rose-200">
        <div
          onClick={(e) => handleStatusClick(e)}
          className="flex justify-between items-center py-1"
        >
          <span className="text-xs text-gray-600">Pending On Me</span>
          <span className="text-xs font-semibold text-gray-800">
            {String(pendingOnMe).padStart(2, "0")}
          </span>
        </div>

        <div
          onClick={(e) => handleStatusClick(e)}
          className="flex justify-between items-center py-1"
        >
          <span className="text-xs text-gray-600">Created By Me</span>
          <span className="text-xs font-semibold text-gray-800">
            {String(createdByMeTotal).padStart(2, "0")}
          </span>
        </div>

        <div
          onClick={(e) => handleStatusClick(e, "Completed")}
          className="flex justify-between items-center py-1"
        >
          <span className="text-xs text-gray-600">Completed</span>
          <span className="text-xs font-semibold text-gray-800">
            {String(createdByMeCompleted).padStart(2, "0")}
          </span>
        </div>
      </div>
    </div>
  );
};
