import { TableCell, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { TaskRowProps } from "@/types/tasks";
import { StatusBadge } from "./StatusBadge";
import { TaskActions } from "./TaskActions";

const formatDueDate = (dueDate?: string) => {
  return dueDate ? format(new Date(dueDate), "MMM dd, yyyy") : "No due date";
};

export const TaskRow = ({
  task,
  index,
  activeFilter,
  onRowClick,
  onEdit,
  onDelete,
  hideAssignedTo = false,
  currentPage = 1,
  perPage = 10,
}: TaskRowProps) => {
  const formattedDueDate = formatDueDate(task.due_date);

  const isEdited = task.creation != task.modified;
  const isPrivate = task.private;

  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => onRowClick(task.name)}
      key={task.name}
    >
      <TableCell>{index + 1 + (currentPage - 1) * perPage}</TableCell>
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
          hideDelete={isEdited && !isPrivate}
          showRestore={activeFilter === "deleted-tasks"}
        />
      </TableCell>
    </TableRow>
  );
};

export default TaskRow;
