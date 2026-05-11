import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status?: string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const getStatusBadgeStyles = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case "pending approver 1":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "pending approver 2":
        return "bg-orange-100 text-orange-800 hover:bg-orange-100";
      case "pending cheque details":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "pending cfo":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      case "pending md":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      case "pending property po":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      case "pending miro":
        return "bg-indigo-100 text-indigo-800 hover:bg-indigo-100";
      case "completed":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "rejected":
        return "bg-red-muted text-red-800 hover:bg-red-100";
      case "draft":
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
      case "expired":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      case "expiring soon":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "unknown":
        return "bg-gray-100 text-gray-500 hover:bg-gray-100";
      default:
        return "bg-gray-100 text-gray-500 hover:bg-gray-100";
    }
  };

  return (
    <Badge
      className={cn(getStatusBadgeStyles(status), "rounded-full h-8 min-w-8")}
      variant="outline"
    >
      {status || "Unknown"}
    </Badge>
  );
};

export default StatusBadge;
