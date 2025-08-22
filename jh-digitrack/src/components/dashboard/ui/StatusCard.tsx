const getBorderColor = (status: string, type?: string) => {
  const s = status.toLowerCase();

  if (type === "travel") {
    switch (s) {
      case "approval pending":
        return "border-yellow-200";
      case "urgent":
        return "border-red-200";
      case "reconfirmation pending":
        return "border-blue-200";
      default:
        return "border-gray-200";
    }
  }

  switch (s) {
    case "open":
      return "border-sky-200";
    case "in_progress":
      return "border-orange-200";
    case "completed":
      return "border-green-200";
    case "canceled":
      return "border-red-200";
    default:
      return "border-gray-200";
  }
};
const ageOrder = [
  "Within(Rev.)Due Dt.",
  "1-10 days overdue",
  "11-30 days overdue",
  "30+ days overdue",
];
export const StatusCard = ({
  status,
  count,
  ages,
  type,
}: {
  status: string;
  count: number;
  ages?: { label: string; count: number }[];
  type?: "task" | "travel";
}) => (
  <div
    className={`rounded-xl bg-white/70 backdrop-blur border ${getBorderColor(
      status,
      type
    )} p-4 shadow hover:shadow-md transition text-center`}
  >
    <div className="min-h-[2.5rem] text-sm text-gray-600 break-normal whitespace-normal overflow-hidden">
      {status}
    </div>

    <div
      className={`mt-1 text-3xl font-bold ${
        type === "travel" ? "text-red-600" : "text-gray-800"
      }`}
    >
      {count}
    </div>


  {(ages ?? [])
    .sort((a, b) => ageOrder.indexOf(a.label) - ageOrder.indexOf(b.label))
    .map((a, idx) => (
      <div key={idx} className="text-xs text-gray-500 text-left">
        <span className="font-semibold">{a.count}</span> task
        {a.count > 1 ? "s" : ""}:{" "}
        <span
          className={`font-bold ${
            a.label === "Within(Rev.)Due Dt." ? "text-gray-500" : "text-red-600"
          }`}
        >
          {a.label}
        </span>
      </div>

  ))}


  </div>
);


