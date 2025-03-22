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
import { Task } from "@/types/tasks";
import { useCurrentUser } from "@/hooks/auth";

interface TaskStatusSelectorProps {
  task: Task;
  handleStatusChange: (status: string) => void;
}

const statusColorMap: Record<string, string> = {
  open: "bg-blue-400",
  "in progress": "bg-yellow-400",
  completed: "bg-green-400",
  cancelled: "bg-red-400",
  closed: "bg-gray-400",
};

export function TaskStatusSelector({
  task,
  handleStatusChange,
}: TaskStatusSelectorProps) {
  const { data: taskMetadata, isLoading: isTaskMetadataLoading } =
    useDocTypeMeta("JH Tasks Master");
  const { data: currentUser, isLoading: isCurrentUserLoading } =
    useCurrentUser();

  if (isTaskMetadataLoading || isCurrentUserLoading)
    return <Skeleton className="w-[180px] h-10" />;

  const statusOptions = taskMetadata.fields
    .find((field: { fieldname: string }) => field.fieldname === "status")
    .options.split("\n");

  /**
   * if currentUser is not owner, then they cannot close the task
   * Open → Can change to In Progress, Canceled, or Completed.
   * In Progress → Can change to Canceled or Completed.
   * Canceled → Can change to Closed or Open.
   * Completed → Can change to Closed or Open.
   */

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
      case "In Progress":
        return initialStatusOptions.filter(
          (status: string) => status !== "Closed" && status !== "Open"
        );
      case "Canceled":
        return initialStatusOptions.filter(
          (status: string) =>
            status === "Closed" || status === "Open" || status === "Canceled"
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
      <SelectTrigger disabled={task.status === "Closed"} className="w-[180px]">
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
