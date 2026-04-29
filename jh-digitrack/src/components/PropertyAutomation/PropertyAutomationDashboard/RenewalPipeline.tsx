

function RenewalPipeline() {

  const pipelineStages = [
    {
      label: "Draft",
      status: "Draft",
      count: 5,
      color: "bg-sky-100 text-sky-800 border-sky-200",
    },
    {
      label: "Pending Division Head",
      status: "Pending Approver 1",
      count: 10,
      color: "bg-amber-100 text-amber-800 border-amber-200",
    },
    {
      label: "Pending GM Approval",
      status: "Pending Approver 2",
      count: 8,
      color: "bg-sky-100 text-sky-800 border-sky-200",
    },
    {
      label: "Pending CFO Approval",
      status: "Pending CFO",
      count: 12,
      color: "bg-amber-100 text-amber-800 border-amber-200",
    },
    {
      label: "Pending MD Approval",
      status: "Pending MD",
      count: 4,
      color: "bg-amber-100 text-amber-800 border-amber-200",
    },

    {
      label: "Pending Cheque Details",
      status: "Pending Cheque Details",
      count: 6,
      color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    },
    {
      label: "Pending PO",
      status: "Pending Property PO",
      count: 7,
      color: "bg-purple-100 text-purple-800 border-purple-200",
    },
    {
      label: "Pending MIRO",
      status: "Pending MIRO",
      count: 3,
      color: "bg-purple-100 text-purple-800 border-purple-200",
    },
    {
      label: "Completed",
      status: "Completed",
      count: 20,
      color: "bg-green-100 text-green-800 border-green-200",
    },
    {
      label: "Withdraw",
      status: "Withdrawn",
      count: 2,
      color: "bg-red-100 text-red-800 border-red-200",
    },
  ];

  return (

    <div>
            <h2 className="text-lg font-bold text-primary py-4">Renewal Pipeline</h2>
          <div className="flex items-center gap-2 py-2">
          {pipelineStages.map((stage, index) => (
            <div key={stage.status} className="flex items-center">
              
              {/* Card */}
              <div
                // onClick={() =>
                //   navigate(`/property/renewals?status=${stage.status}`)
                // }
                className={`min-w-[100px] h-30 cursor-pointer rounded-2xl border p-4 shadow-sm hover:shadow-md transition ${
                  stage.count === 0 ? "opacity-40" : stage.color
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <span className="text-lg font-bold">{stage.count}</span>
                  <span className="text-xs font-semibold">
                    {stage.label}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              {index !== pipelineStages.length - 1 && (
                <div className=" text-gray-400 text-xl">→</div>
              )}
            </div>
          ))}
        </div>

    </div>
        
  );
}

export default RenewalPipeline;