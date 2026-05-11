import { useNavigate } from "react-router";
import RenewalPipeline from "./RenewalPipeline"
import { UrgentAlerts, AlertItem } from "./UrgentAlerts";
import { usePropertyDashboardCounts } from "../hooks/useProperty";


function PropertyAutomationDashboard() {

  const navigate = useNavigate();
  const { data: counts, isLoading } = usePropertyDashboardCounts();

  const attention = counts?.attention;

  const alerts: AlertItem[] = [
    attention?.overdue_no_renewal
      ? {
          message: `${attention.overdue_no_renewal} properties are overdue with no renewal started`,
          subText: "Immediate attention required",
          count: attention.overdue_no_renewal,
          severity: "critical",
          link: "/jh-digitrack/property/properties?attention_filter=overdue_no_renewal",
          cta: "View Properties",
        }
      : undefined,
    attention?.stalled_renewals
      ? {
          message: `${attention.stalled_renewals} renewals stalled for more than 7 days`,
          subText: "No recent activity",
          count: attention.stalled_renewals,
          severity: "high",
          link: "/jh-digitrack/property/renewals?attention_filter=stalled_7_days",
          cta: "View Renewals",
        }
      : undefined,
    attention?.pending_my_action
      ? {
          message: `${attention.pending_my_action} renewals pending your action`,
          subText: "Awaiting your action",
          count: attention.pending_my_action,
          severity: "medium",
          link: "/jh-digitrack/property/renewals?pending_my_action=1",
          cta: "Review & Approve",
        }
      : undefined,
    attention?.hassantuk_expiring_soon
      ? {
          message: `${attention.hassantuk_expiring_soon} Hassantuk renewals expiring soon`,
          subText: "Within 30 days",
          count: attention.hassantuk_expiring_soon,
          severity: "high",
          link: "/jh-digitrack/property/properties?attention_filter=hassantuk_expiring_soon",
          cta: "View Properties",
        }
      : undefined,
    attention?.cdc_expiring_soon
      ? {
          message: `${attention.cdc_expiring_soon} CDC expiries expiring soon`,
          subText: "Within 30 days",
          count: attention.cdc_expiring_soon,
          severity: "high",
          link: "/jh-digitrack/property/properties?attention_filter=cdc_expiring_soon",
          cta: "View Properties",
        }
      : undefined,
    attention?.po_box_expiring_soon
      ? {
          message: `${attention.po_box_expiring_soon} PO Box renewals due soon`,
          subText: "Within 30 days",
          count: attention.po_box_expiring_soon,
          severity: "medium",
          link: "/jh-digitrack/property/properties?attention_filter=po_box_expiring_soon",
          cta: "View Properties",
        }
      : undefined,
  ].filter(Boolean) as AlertItem[];

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
        <div className="flex flex-col gap-0 pb-6">
            <h2 className="text-lg font-bold text-primary">Property Management</h2>
            <p className="text-gray-400 text-sm">Your portfolio at a glance</p>
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
            <UrgentAlerts alerts={alerts} navigate={navigate} isLoading={isLoading} />
            
        </div>
        
    </div>
  )
}

export default PropertyAutomationDashboard
