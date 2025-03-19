import { TableCell, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { TaskRowProps } from "@/types/tasks";
import { StatusBadge } from "./StatusBadge";
import { TaskActions } from "./TaskActions";

export const TaskRow = ({
  task,
  index,
  activeFilter,
  onRowClick,
  onEdit,
  onDelete,
  hideAssignedTo = false,
  hideDelete = false,
}: TaskRowProps) => {
  const formattedDueDate = task.due_date
    ? format(new Date(task.due_date), "MMM dd, yyyy")
    : "No due date";

  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => onRowClick(task.name)}
      key={task.name}
    >
      <TableCell>{index + 1}</TableCell>
      <TableCell className="font-medium">{task.task_name}</TableCell>
      <TableCell>
        <StatusBadge status={task.status} />
      </TableCell>
      <TableCell>{formattedDueDate}</TableCell>
      {!hideAssignedTo && (
        <TableCell>
          {activeFilter === "my-tasks" ? task.created_by : task.assigned_to}
        </TableCell>
      )}
      <TableCell className="text-right">
        <TaskActions
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          hideDelete={hideDelete}
        />
      </TableCell>
    </TableRow>
  );
};

export default TaskRow;
