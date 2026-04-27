import { useNavigate } from "react-router";
import RenewalPipeline from "./RenewalPipeline"
import { UrgentAlerts, AlertItem } from "./UrgentAlerts";
import { usePropertyDashboardCounts } from "../hooks/useProperty";


function PropertyAutomationDashboard() {

    const navigate = useNavigate();
    const { data: counts, isLoading } = usePropertyDashboardCounts();

     const alerts: AlertItem[] = [
    {
      message: "3 properties are overdue with no renewal started",
      subText: "Immediate attention required",
      count: 3,
      severity: "critical",
      link: "/property?filter=overdue",
      cta: "View Properties",
    },
    {
      message: "5 renewals stalled for more than 7 days",
      subText: "No recent activity",
      count: 5,
      severity: "high",
      link: "/property/renewals?filter=stalled",
      cta: "View Renewals",
    },
    {
      message: "2 renewals pending your approval",
      subText: "Awaiting your action",
      count: 2,
      severity: "medium",
      link: "/property/renewals?filter=my_approvals",
      cta: "Review & Approve",
    },
    {
      message: "4 Hassantuk renewals expiring soon",
      subText: "Within 30 days",
      count: 4,
      severity: "high",
      link: "/property?filter=hassantuk",
      cta: "View Property",
    },
    {
      message: "2 PO Box renewals due soon",
      subText: "Within 30 days",
      count: 2,
      severity: "medium",
      link: "/property?filter=pobox",
      cta: "View Property",
    },
  ];

  const handleNavigateToProperties = (filter?: string) => {
    if (filter) {
      navigate(`/jh-digitrack/property/properties?renewal_filter=${filter}`);
    } else {
      navigate("/jh-digitrack/property/properties");
    }
  };

  const displayCount = (value?: number) => {
    if (isLoading) return "...";
    return value ?? 0;
  };

  return (
    <div>
        <div className="flex flex-col gap-1 pb-6">
            <h2 className="text-lg font-bold text-primary">Property Management</h2>
            <p className="text-gray-400">Your portfolio at a glance</p>
          </div>
        <div className="grid grid-cols-1 gap-2">
          {/* row1 */}
             <div className="grid grid-cols-5 gap-5 items-center">
                <div 
                  onClick={() => handleNavigateToProperties()}
                  className="relative cursor-pointer bg-rose-100/60 backdrop-blur border border-rose-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition"
                >
                    <div className="flex flex-col gap-1 text-gray-500 text-center">
                            <span className="font-bold text-lg">{displayCount(counts?.total_properties)}</span>
                            <span className={`font-semibold`}>Total Props</span>
                    </div>
                </div>
                 <div 
                  onClick={() => handleNavigateToProperties("30")}
                  className="relative cursor-pointer bg-blue-100 text-blue-800 backdrop-blur border border-blue-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition"
                >
                    <div className="flex flex-col gap-1  text-center">
                            <span className="font-bold text-lg">{displayCount(counts?.renewals_30_days)}</span>
                            <span className={`font-semibold`}>Renewals ≤ 30 Days</span>
                    </div>
                </div>
                 <div 
                  onClick={() => handleNavigateToProperties("60")}
                  className="relative cursor-pointer bg-amber-100 text-amber-800 backdrop-blur border border-amber-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition"
                >
                    <div className="flex flex-col gap-1 text-center">
                            <span className="font-bold text-lg">{displayCount(counts?.renewals_60_days)}</span>
                            <span className={`font-semibold`}>Renewals ≤ 60 Days</span>
                    </div>
                </div>
                 <div 
                  onClick={() => handleNavigateToProperties("90")}
                  className="relative cursor-pointer bg-orange-100 text-orange-800 backdrop-blur border border-orange-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition"
                >
                    <div className="flex flex-col gap-1  text-center">
                            <span className="font-bold text-lg">{displayCount(counts?.renewals_90_days)}</span>
                            <span className={`font-semibold`}>Renewals ≤ 90 Days</span>
                    </div>
                </div>
                 <div 
                  onClick={() => handleNavigateToProperties("overdue")}
                  className="relative cursor-pointer bg-red-200 text-red-800 backdrop-blur border border-red-300 rounded-2xl shadow-sm p-6 hover:shadow-md transition"
                >
                    <div className="flex flex-col gap-1 text-center">
                            <span className="font-bold text-lg">{displayCount(counts?.overdue)}</span>
                            <span className={`font-semibold`}>Overdue</span>
                    </div>
                </div>
            </div>

             {/* row2 */}
            <RenewalPipeline/>
            <UrgentAlerts alerts={alerts} navigate={navigate} />
            
        </div>
        
    </div>
  )
}

export default PropertyAutomationDashboard
