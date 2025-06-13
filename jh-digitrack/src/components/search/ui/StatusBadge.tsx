import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status?: string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const getStatusBadgeStyles = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "in progress":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "canceled":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      case "completed":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "closed":
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

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
