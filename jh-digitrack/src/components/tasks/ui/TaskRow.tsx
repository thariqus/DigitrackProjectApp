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
      <TableCell>
        {
          activeFilter === "my-tasks" ? task.created_by : task["assigned_to"] //TODO: populate owner name
        }
      </TableCell>
      <TableCell className="text-right">
        <TaskActions task={task} onEdit={onEdit} onDelete={onDelete} />
      </TableCell>
    </TableRow>
  );
};

export default TaskRow;
