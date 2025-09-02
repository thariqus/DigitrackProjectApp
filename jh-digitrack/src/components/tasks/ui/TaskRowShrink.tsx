// import { TableCell, TableRow } from "@/components/ui/table";
// import { Task } from "@/types/tasks";
// import { StatusBadge } from "./StatusBadgeShrink";

// type Props = {
//   task: Task;
//   index: number;
//   currentPage: number;
//   perPage: number;
//   handleRowClick: (id: string) => void;   // added
//   onDelete: (id: string) => void;         // added
//   onEdit?: (id: string) => void;  // optional edit handler
// };

// export const TaskRowShrink = ({
//   task,
//   index,
//   currentPage,
//   perPage,
//   handleRowClick,
//   onDelete,
// }: Props) => {
//   return (
//     <TableRow
//       className="text-[10px] cursor-pointer hover:bg-gray-50"
//       onClick={() => handleRowClick(task.name)}
//     >
//       <TableCell className="px-1 py-0.5">
//         {index + 1 + (currentPage - 1) * perPage}
//       </TableCell>
//       <TableCell className="px-1 py-0.5 font-medium">{task.task_name}</TableCell>
//       <TableCell className="px-1 py-0.5">
//         <StatusBadge status={task.status} size="xs" />
//       </TableCell>
//       <TableCell className="px-1 py-0.5">{task.due_date || "—"}</TableCell>
//       <TableCell className="px-1 py-0.5">{task.assigned_to || "—"}</TableCell>
//       <TableCell className="px-1 py-0.5">{task.created_by || "—"}</TableCell>
//       <TableCell className="px-1 py-0.5 text-red-500">
//       </TableCell>
//     </TableRow>
//   );
// };

// export default TaskRowShrink;

import { TableCell, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Task, TaskRowProps } from "@/types/tasks";
import { StatusBadge } from "./StatusBadgeShrink";
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

export const TaskRowShrink = ({
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
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] font-medium">{task.task_name}</span>
        <Link
          className="underline font-normal text-[8px] text-gray-500"
          to={to}
        >
          {`${task.source}${task.serial_number ? "#" + task.serial_number : ""}`}
        </Link>
      </div>
    );
  }

  return (
    <TableRow
      className="text-[10px] cursor-pointer hover:bg-gray-50"
      onClick={() => onRowClick(task.name)}
      key={task.name}
    >
      <TableCell className="px-1 py-0.5">{index + 1 + (currentPage - 1) * perPage}</TableCell>
      <TableCell className="px-1 py-0.5 font-small">{taskName}</TableCell>
      <TableCell className="px-1 py-0.5">
        <StatusBadge status={task.status} size="xs" />
      </TableCell>
      <TableCell className="px-1 py-0.5">
        <div>
          <p>{formattedDueDate}</p>
          <p>{formattedRevisedDueDate}</p>
        </div>
      </TableCell>

      {!hideAssignedTo && (
        <TableCell className="px-1 py-0.5">
          {activeFilter === "my-tasks" ? task.created_by : task.assigned_to}
        </TableCell>
      )}
      <TableCell className="px-1 py-0.5 text-right">
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

export default TaskRowShrink;
