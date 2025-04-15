import { Button } from "@/components/ui/button";
import { FileEdit, Trash2, ArchiveRestore } from "lucide-react";
import { TaskActionsProps } from "@/types/tasks";
import { useCurrentUser } from "@/hooks/auth";
import { useUpdateDoc } from "@/hooks/doc";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
export const TaskActions = ({
  task,
  onEdit,
  onDelete,
  hideDelete,
  showRestore = false,
}: TaskActionsProps) => {
  const updateDoc = useUpdateDoc();
  const queryClient = useQueryClient();
  const taskId = task.name;
  const { data: currentUser } = useCurrentUser();
  const isMyTask = currentUser === task.owner;

  const handleRestore = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    await updateDoc.mutateAsync({
      doc: {
        deleted_at: null,
      },
      name: taskId,
      doctype: "JH Task Master",
    });

    await queryClient.invalidateQueries({
      queryKey: ["Docs"],
    });
    toast.success("Task restored successfully");
  };

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
      {showRestore && (
        <Button variant="ghost" size="icon" onClick={handleRestore}>
          <ArchiveRestore className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default TaskActions;
