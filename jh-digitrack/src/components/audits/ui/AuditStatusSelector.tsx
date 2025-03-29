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
import { JHAudits } from "@/types/JHDigitrack/JHAudits";
import { useCurrentUser } from "@/hooks/auth";

interface AuditStatusSelectorProps {
  audit: JHAudits;
  handleStatusChange: (status: string) => void;
}

const statusColorMap: Record<string, string> = {
  open: "bg-blue-400",
  completed: "bg-green-400",
};

export function AuditStatusSelector({
  audit: task,
  handleStatusChange,
}: AuditStatusSelectorProps) {
  const { data: auditMetadata, isLoading: isAuditMetadataLoading } =
    useDocTypeMeta("JH Audits");
  const { data: currentUser, isLoading: isCurrentUserLoading } =
    useCurrentUser();

  if (isAuditMetadataLoading || isCurrentUserLoading)
    return <Skeleton className="w-[180px] h-10" />;

  const statusOptions = auditMetadata.fields
    .find((field: { fieldname: string }) => field.fieldname === "status")
    .options.split("\n");

  const filterStatusOptions = () => {
    let initialStatusOptions = statusOptions;
    if (currentUser !== task.owner) {
      initialStatusOptions = statusOptions.filter(
        (status: string) => status !== "Closed"
      );
    }
    switch (task.status) {
      case "Open":
        return initialStatusOptions.filter(
          (status: string) => status !== "Closed"
        );
      case "Completed":
        return initialStatusOptions.filter(
          (status: string) =>
            status === "Closed" || status === "Open" || status === "Completed"
        );
    }
    return initialStatusOptions;
  };

  return (
    <Select value={task.status} onValueChange={handleStatusChange}>
      <SelectTrigger
        disabled={task.status === "Completed"}
        className="w-[180px]"
      >
        <SelectValue placeholder="Select status" />
      </SelectTrigger>
      <SelectContent>
        {filterStatusOptions().map((status: string) => (
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
