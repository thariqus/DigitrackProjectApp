import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status?: string;
  size?: "sm" | "xs"; 
}

export const StatusBadge = ({ status, size = "sm" }: StatusBadgeProps) => {
  const getStatusBadgeStyles = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "bg-blue-100 text-blue-800";
      case "in progress":
        return "bg-yellow-100 text-yellow-800";
      case "canceled":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const sizeClasses =
    size === "xs"
      ? "h-4 min-w-[24px] text-[8px] px-1 py-0.5"
      : "h-6 min-w-[32px] text-xs px-2 py-1";

  return (
    <Badge
      className={cn(getStatusBadgeStyles(status), sizeClasses)}
      variant="outline"
    >
      {status || "Unknown"}
    </Badge>
  );
};

export default StatusBadge;
