import { FolderKanban } from "lucide-react";

export const ProjectCard = ({
  title,
  count = 0,
}: {
  title: string;
  filterKey: string;
  count?: number;
}) => {
  const handleClick = () => {
    window.location.href = `/jh-digitrack/projects`;
  };

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer bg-rose-100/60 backdrop-blur border border-rose-200 rounded-xl shadow-sm p-3 hover:shadow-md transition"
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1.5">
          <FolderKanban size={14} className="text-primary flex-shrink-0  !important" />
          <h3 className="text-sm font-semibold text-primary">{title}</h3>
        </div>
        <span className="text-sm font-bold text-gray-700">{String(count).padStart(2, "0")}</span>
      </div>

      <div className="flex flex-col divide-y divide-rose-200">
        <div className="flex justify-between items-center py-1">
          <span className="text-xs text-gray-600">Open</span>
          <span className="text-xs font-semibold text-gray-800">{String(count).padStart(2, "0")}</span>
        </div>
      </div>
    </div>
  );
};
