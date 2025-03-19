import { useDocTypeMeta } from "@/hooks/doc";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskStatusSelectorProps {
  currentStatus: string;
  handleStatusChange: (status: string) => void;
  hideClosed?: boolean;
}

export function TaskStatusSelector({
  currentStatus,
  handleStatusChange,
  hideClosed = false,
}: TaskStatusSelectorProps) {
  const { data, isLoading } = useDocTypeMeta("JH Tasks Master");

  if (isLoading) return <Skeleton className="w-[180px] h-10" />;
  const statusOptions = data.fields
    .find((field: { fieldname: string }) => field.fieldname === "status")
    .options.split("\n");

  const statusColorMap: Record<string, string> = {
    open: "bg-blue-400",
    "in progress": "bg-yellow-400",
    completed: "bg-green-400",
    cancelled: "bg-red-400",
    closed: "bg-gray-400",
  };

  return (
    <Select value={currentStatus} onValueChange={handleStatusChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select status" />
      </SelectTrigger>
      <SelectContent>
        {statusOptions
          .filter((status: string) => !hideClosed || status !== "Closed")
          .map((status: string) => (
            <SelectItem key={status} value={status}>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    statusColorMap[status.toLocaleLowerCase()] ?? "bg-gray-400"
                  )}
                ></div>
                <span>{status}</span>
              </div>
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
