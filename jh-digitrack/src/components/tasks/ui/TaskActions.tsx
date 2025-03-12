import { Button } from "@/components/ui/button";
import { FileEdit, Trash2 } from "lucide-react";
import { TaskActionsProps } from "@/types/tasks";
import { useCurrentUser } from "@/hooks/auth";

export const TaskActions = ({ task, onEdit, onDelete }: TaskActionsProps) => {
  const taskId = task.name;
  const { data: currentUser } = useCurrentUser();
  const isMyUser = currentUser === task.owner;
  return (
    <div className="flex justify-end">
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
      {isMyUser && (
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
