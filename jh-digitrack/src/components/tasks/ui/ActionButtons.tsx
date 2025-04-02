import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ActionButtonsProps } from "@/types/tasks";

export const ActionButtons = ({
  onCreateTask,
  disabled = false,
}: ActionButtonsProps) => (
  <div className="flex justify-end">
    <Button onClick={onCreateTask} size="sm" disabled={disabled}>
      <Plus className="mr-2 h-4 w-4" />
      Create Task
    </Button>
  </div>
);

export default ActionButtons;
