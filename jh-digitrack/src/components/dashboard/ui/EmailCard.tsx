import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { getEmailDashboardStats, type EmailDashboardStats } from "@/hooks/email_stats";

export const EmailCard = () => {
  const [stats, setStats] = useState<EmailDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getEmailDashboardStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const success = stats?.stat_tiles?.find((t) => t.label === "Success")?.value ?? 0;
  const failure = stats?.stat_tiles?.find((t) => t.label === "Failure")?.value ?? 0;
  const total = Number(success) + Number(failure);

  const handleClick = () => {
    window.location.href = "/jh-digitrack/email";
  };

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer bg-rose-100/60 backdrop-blur border border-rose-200 rounded-xl shadow-sm p-3 hover:shadow-md transition"
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1.5">
          <Mail size={14} className="text-primary flex-shrink-0 !important" />
          <h3 className="text-sm font-semibold text-primary">Email</h3>
        </div>
        <span className="text-sm font-bold text-gray-700">
          {loading ? "..." : String(total).padStart(2, "0")}
        </span>
      </div>

      <div className="flex flex-col divide-y divide-rose-200">
        <div className="flex justify-between items-center py-1">
          <span className="text-xs text-gray-600">Success</span>
          <span className="text-xs font-semibold text-gray-800">
            {loading ? "..." : String(success).padStart(2, "0")}
          </span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-xs text-gray-600">Failure</span>
          <span className="text-xs font-semibold text-gray-800">
            {loading ? "..." : String(failure).padStart(2, "0")}
          </span>
        </div>
      </div>
    </div>
  );
};
