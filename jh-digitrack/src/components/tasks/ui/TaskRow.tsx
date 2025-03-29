import { TableCell, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { TaskRowProps } from "@/types/tasks";
import { StatusBadge } from "./StatusBadge";
import { TaskActions } from "./TaskActions";
import { Link } from "react-router";
import { useDocDetail } from "@/hooks/doc";
import { JHTasksMaster } from "@/types/JHDigitrack/JHTasksMaster";

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

  const { data: taskDetails } = useDocDetail<JHTasksMaster>({
    doctype: "JH Tasks Master",
    name: task.name || "",
    disabled: !task.name,
  });

  const isEdited = taskDetails?.docinfo.versions.some(
    (version) => version.owner !== task.owner
  );
  const isPrivate = task.private;
  const isInRecycleBin = Boolean(task.deleted_at);

  let taskName = <span>{task.task_name}</span>;
  if (task.source) {
    taskName = (
      <div>
        <Link className="underline" to={`/jh-digitrack/audits/${task.source}`}>
          {`${task.source}#${task.serial_number}`}
        </Link>{" "}
        | <span>{task.task_name}</span>
      </div>
    );
  }

  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => onRowClick(task.name)}
      key={task.name}
    >
      <TableCell>{index + 1 + (currentPage - 1) * perPage}</TableCell>
      <TableCell className="font-medium">{taskName}</TableCell>
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
          hideDelete={(isEdited && !isPrivate) || isInRecycleBin}
          showRestore={activeFilter === "deleted-tasks"}
        />
      </TableCell>
    </TableRow>
  );
};

export default TaskRow;
