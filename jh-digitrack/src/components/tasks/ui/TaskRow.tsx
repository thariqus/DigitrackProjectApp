import { TableCell, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Task, TaskRowProps } from "@/types/tasks";
import { StatusBadge } from "./StatusBadge";
import { TaskActions } from "./TaskActions";
import { Link } from "react-router";
import { useDocDetail } from "@/hooks/doc";

const formatDueDate = (dueDate?: string) => {
  return dueDate ? format(new Date(dueDate), "MMM dd, yyyy") : "No due date";
};

const formatRevisedDueDate = (
  dueDate?: string,
  revisedDueDate?: string
): string => {
  if (!revisedDueDate) return "-";

  const due = new Date(dueDate || "");
  const revised = new Date(revisedDueDate);

  if (due.getTime() === revised.getTime()) return "-";

  return format(new Date(revised), "MMM dd, yyyy");
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
  hideDelete = false,
}: TaskRowProps) => {
  const formattedDueDate = formatDueDate(task.due_date);
  const formattedRevisedDueDate = formatRevisedDueDate(
    task.due_date,
    task.revised_due_date
  );
  const { data: taskDetails } = useDocDetail<Task>({
    doctype: "JH Task Master",
    name: task.name || "",
    disabled: !task.name,
  });

  const isEdited = taskDetails?.docinfo.versions.some(
    (version) => version.owner !== task.owner
  );
  const isPrivate = task.private;
  const isInRecycleBin = Boolean(task.deleted_at);

  let taskName = <span>{task.task_name}</span>;
  const sourceDocType = task.source_doctype;
  const sourceName = task.source;
  let to = "";

  if (sourceDocType === "JH Audit Master") {
    to = `/jh-digitrack/audits/${sourceName}`;
  } else if (sourceDocType === "JH Grouped Task Master") {
    to = `/jh-digitrack/meetings/${sourceName}`;
  }

  if (task.source) {
    taskName = (
      <div className="flex flex-col gap-1">
        <span>{task.task_name}</span>
        <Link className="underline font-normal text-xs text-gray-500" to={to}>
          {`${task.source}${
            task.serial_number ? "#" + task.serial_number : ""
          }`}
        </Link>
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
      <TableCell>
        <div>
          <p>{formattedDueDate}</p>
          <p>{formattedRevisedDueDate}</p>
        </div>
      </TableCell>

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
          hideDelete={(isEdited && !isPrivate) || isInRecycleBin || hideDelete}
          showRestore={activeFilter === "deleted-tasks"}
        />
      </TableCell>
    </TableRow>
  );
};

export default TaskRow;
