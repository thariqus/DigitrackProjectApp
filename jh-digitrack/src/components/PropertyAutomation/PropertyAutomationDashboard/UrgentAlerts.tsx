import { AlertTriangle, Clock, CheckCircle } from "lucide-react";

export type AlertItem = {
  message: string;
  subText: string;
  count: number;
  severity: "critical" | "high" | "medium";
  link: string;
  cta: string;
};

type NavigateFn = (path: string) => void;

export function UrgentAlerts({
  alerts = [],
  navigate,
  isLoading = false,
}: {
  alerts?: AlertItem[];
  navigate: NavigateFn;
  isLoading?: boolean;
}) {
  // Sort by severity
  const severityOrder = { critical: 1, high: 2, medium: 3 };
  const sortedAlerts = [...alerts].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  // Empty state
  if (isLoading) {
    return (
      <div className="pb-10">
        <h2 className="text-lg font-bold text-primary py-4">Requires attention</h2>
        <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-500">
          Loading attention items...
        </div>
      </div>
    );
  }

  if (!sortedAlerts.length) {
    return (

      <div className="pb-10">
         <div className="flex flex-col gap-1 items-center">
            <h2 className="text-lg font-bold text-primary">Required Attention</h2>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 mt-4">
            <CheckCircle className="text-green-600 text-xs" />
            <span className="text-green-800 font-medium text-sm">
              All caught up — no urgent items
            </span>
         </div>
      </div>
      
    );
  }

  return (

    <div className="pb-10">
            <h2 className="text-lg font-bold text-primary py-4" >Requires attention</h2>
        <div className="flex flex-col gap-3">
      {sortedAlerts.map((alert, index) => (
        <div
          key={index}
          onClick={() => navigate(alert.link)}
          className={`flex items-center justify-between rounded-xl p-2 shadow-sm ${
            alert.severity === "critical"
              ? "border-l-4 border-red-500 "
              : alert.severity === "high"
              ? "border-l-4 border-orange-500 "
              : "border-l-4 border-amber-500 "
          } cursor-pointer transition hover:bg-gray-50`}
        >
          {/* Left */}
          <div className="flex items-center gap-3">
            {alert.severity === "critical" && (
              <AlertTriangle className="text-red-600" />
            )}
            {alert.severity === "high" && (
              <Clock className="text-orange-600" />
            )}
            {alert.severity === "medium" && (
              <Clock className="text-amber-600" />
            )}

            <div className="flex flex-col">
              <span className="font-semibold text-sm">
                {alert.message}
              </span>
              <span className="text-xs text-gray-500">
                {alert.subText}
              </span>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold bg-white px-2 py-1 rounded-md border">
              {alert.count}
            </span>

            <button
              onClick={(event) => {
                event.stopPropagation();
                navigate(alert.link);
              }}
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              {alert.cta} →
            </button>
          </div>
        </div>
      ))}
    </div>
    </div>
    
  );
}
