import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status?: string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const getStatusBadgeStyles = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case "Pending Cheque Entry":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "Pending GM Approval":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "Pending Admin HOD":
        return "bg-orange-100 text-orange-800 hover:bg-orange-100";
      case "Pending CFO":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      case "Pending MD":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      case "completed":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "Pending Property PO":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      case "Pending MIRO":
        return "bg-indigo-100 text-indigo-800 hover:bg-indigo-100";
      case "Rejected":
        return "bg-red-muted text-red-800 hover:bg-red-100";
      case "Sent Back":
        return "bg-red-muted text-red-800 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };open

  return (
    <Badge
      className={cn(getStatusBadgeStyles(status), "h-8 min-w-8")}
      variant="outline"
    >
      {status || "Unknown"}
    </Badge>
  );
};

export default StatusBadge;
