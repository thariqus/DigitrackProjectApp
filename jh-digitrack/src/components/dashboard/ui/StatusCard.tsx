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
    default:
      return "border-gray-200";
  }
};

export const StatusCard = ({
  status,
  count,
  type,
}: {
  status: string;
  count: number;
  type?: "task" | "travel";
}) => (
  <div
    className={`rounded-xl bg-white/70 backdrop-blur border ${getBorderColor(
      status,
      type
    )} p-4 shadow hover:shadow-md transition text-center`}
  >
    <div className="text-sm text-gray-600">{status}</div>
    <div className="mt-1 text-3xl font-bold text-gray-800">{count}</div>
  </div>
);
