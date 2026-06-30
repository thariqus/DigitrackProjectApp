import { useNavigate } from "react-router";
import { useRenewalPipelineCounts } from "../hooks/useProperty";

const APPROVER_STATUSES = [
  "Pending Approver 1",
  "Pending Approver 2",
  "Pending Approver 3",
  "Pending Approver 4",
  "Pending Approver 5",
  "Pending Approver 6",
];

const APPROVER_KEYS = [
  "pending_approver_1",
  "pending_approver_2",
  "pending_approver_3",
  "pending_approver_4",
  "pending_approver_5",
  "pending_approver_6",
] as const;

function RenewalPipeline() {
  const navigate = useNavigate();
  const { data: counts, isLoading } = useRenewalPipelineCounts();

  const pipelineStages = [
    {
      label: "Draft",
      status: "Draft",
      apiKey: "draft",
      color: "bg-sky-100 text-sky-800 border-sky-200",
    },
    {
      label: "Pending Cheque Details",
      status: "Pending Cheque Details",
      apiKey: "pending_cheque_details",
      color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    },
    {
      label: "Admin HOD",
      status: "Pending Admin HOD",
      apiKey: "pending_admin_hod",
      color: "bg-amber-100 text-amber-800 border-amber-200",
    },
    {
      label: "FC",
      status: "Pending FC",
      apiKey: "pending_fc",
      color: "bg-orange-100 text-orange-800 border-orange-200",
    },
    {
      label: "Pending CFO Approval",
      status: "Pending CFO",
      apiKey: "pending_cfo",
      color: "bg-amber-100 text-amber-800 border-amber-200",
    },
    {
      label: "Pending MD Approval",
      status: "Pending MD",
      apiKey: "pending_md",
      color: "bg-amber-100 text-amber-800 border-amber-200",
    },
    {
      label: "Pending PO",
      status: "Pending Property PO",
      apiKey: "pending_property_po",
      color: "bg-purple-100 text-purple-800 border-purple-200",
    },
    {
      label: "Pending MIRO",
      status: "Pending MIRO",
      apiKey: "pending_miro",
      color: "bg-purple-100 text-purple-800 border-purple-200",
    },
    {
      label: "Completed",
      status: "Completed",
      apiKey: "completed",
      color: "bg-green-100 text-green-800 border-green-200",
    },
    {
      label: "Withdrawn",
      status: "Withdrawn",
      apiKey: "withdrawn",
      color: "bg-red-100 text-red-800 border-red-200",
    },
  ];

  const getCount = (apiKey: string): number => {
    if (isLoading || !counts) return 0;
    return counts[apiKey as keyof typeof counts] || 0;
  };

  const getApproverCount = (): number => {
    if (isLoading || !counts) return 0;
    return APPROVER_KEYS.reduce((sum, key) => sum + (counts[key] || 0), 0);
  };

  const handleStageClick = (status: string, count: number) => {
    if (count > 0) {
      navigate(`/jh-digitrack/property/renewals?workflow_states=${encodeURIComponent(JSON.stringify([status]))}`);
    }
  };

  const handleApproversClick = (count: number) => {
    if (count > 0) {
      navigate(`/jh-digitrack/property/renewals?workflow_states=${encodeURIComponent(JSON.stringify(APPROVER_STATUSES))}`);
    }
  };

  const displayCount = (apiKey: string) => {
    if (isLoading) return "...";
    return getCount(apiKey);
  };

  const approverCount = getApproverCount();

  // Inject the combined Approvers card after Draft
  const allStages = [
    pipelineStages[0], // Draft
    null,              // sentinel for the combined Approvers card
    ...pipelineStages.slice(1),
  ];

  return (
    <div>
      <h2 className="text-lg font-bold text-primary py-4">Renewal Pipeline</h2>
      <div className="flex items-center gap-2 py-2 overflow-x-auto">
        {allStages.map((stage, index) => {
          const isApproversCard = stage === null;
          const stageCount = isApproversCard ? approverCount : getCount(stage!.apiKey);
          const isLast = index === allStages.length - 1;

          return (
            <div key={isApproversCard ? "approvers" : stage!.status} className="flex items-center">
              {isApproversCard ? (
                <div
                  onClick={() => handleApproversClick(approverCount)}
                  className={`max-w-[70px] h-28 rounded-2xl border p-2 shadow-sm transition ${
                    approverCount === 0
                      ? "opacity-40 cursor-not-allowed"
                      : "cursor-pointer hover:shadow-md bg-amber-100 text-amber-800 border-amber-200"
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <span className="text-lg font-bold">{isLoading ? "..." : approverCount}</span>
                    <span className="text-xs font-semibold">Approvers</span>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => handleStageClick(stage!.status, stageCount)}
                  className={`min-w-[80px] h-28 rounded-2xl border p-4 shadow-sm transition ${
                    stageCount === 0
                      ? "opacity-40 cursor-not-allowed"
                      : `cursor-pointer hover:shadow-md ${stage!.color}`
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <span className="text-lg font-bold">{displayCount(stage!.apiKey)}</span>
                    <span className="text-xs font-semibold">{stage!.label}</span>
                  </div>
                </div>
              )}

              {!isLast && (
                <div className="text-gray-400 text-xl mx-1">→</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RenewalPipeline;
