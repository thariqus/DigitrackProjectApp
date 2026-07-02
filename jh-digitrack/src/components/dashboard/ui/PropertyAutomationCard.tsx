import { Warehouse } from "lucide-react";
import { usePropertyDashboardCounts } from "@/components/PropertyAutomation/hooks/useProperty";

const stats = [
  { label: "Active", key: "active_properties" as const },
  { label: "Due ≤ 30 Days", key: "renewals_30_days" as const },
  { label: "Due ≤ 90 Days", key: "renewals_90_days" as const },
  { label: "Overdue", key: "overdue" as const },
];

export const PropertyAutomationCard = () => {
  const { data: counts, isLoading, isError } = usePropertyDashboardCounts();

  if (isError) return null;

  const total = stats.reduce((sum, s) => sum + (counts?.[s.key] ?? 0), 0);

  const handleClick = () => {
    window.location.href = "/jh-digitrack/property/dashboard";
  };

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer bg-rose-100/60 backdrop-blur border border-rose-200 rounded-xl shadow-sm p-3 hover:shadow-md transition"
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1.5">
          <Warehouse size={14} className="text-primary flex-shrink-0 !important" />
          <h3 className="text-sm font-semibold text-primary">Property Automation System</h3>
        </div>
        <span className="text-sm font-bold text-gray-700">
          {isLoading ? "..." : String(total).padStart(2, "0")}
        </span>
      </div>

      <div className="flex flex-col divide-y divide-rose-200">
        {stats.map((stat) => (
          <div key={stat.key} className="flex justify-between items-center py-1">
            <span className="text-xs text-gray-600">{stat.label}</span>
            <span className="text-xs font-semibold text-gray-800">
              {isLoading ? "..." : String(counts?.[stat.key] ?? 0).padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
