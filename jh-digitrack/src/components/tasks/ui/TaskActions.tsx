import { Button } from "@/components/ui/button";
import { FileEdit, Trash2 } from "lucide-react";
import { TaskActionsProps } from "@/types/tasks";
import { useCurrentUser } from "@/hooks/auth";

export const TaskActions = ({
  task,
  onEdit,
  onDelete,
  hideDelete,
}: TaskActionsProps) => {
  const taskId = task.name;
  const { data: currentUser } = useCurrentUser();
  const isMyTask = currentUser === task.owner;
  return (
    <div className="flex justify-center">
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(taskId);
        }}
      >
        <FileEdit className="h-4 w-4" />
      </Button>
      {isMyTask && !hideDelete && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(taskId);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default TaskActions;
