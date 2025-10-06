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
import { StatusBadge } from "./StatusBadge";
import { TaskActions } from "./TaskActions";
import { Link } from "react-router";
import { useDoc, useDocDetail } from "@/hooks/doc";
import { JHBusinessMaster } from "@/types/JHDigitrack/JHBusinessMaster";
import { useJhUser } from "@/hooks/auth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
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
  const { data: business } = useDoc<JHBusinessMaster>({
    doctype: "JH Business Master",
    name: task?.business_id || "",
    disabled: !task?.business_id,
  });

  const commentLogs =
    taskDetails?.docinfo?.comments?.slice(0, 5).map((log) => ({
      ...log,
      owner_user_id: log.owner,
    })) || [];

  const commentLogsSorted = [...commentLogs].sort(
    (a, b) => new Date(a.creation).getTime() - new Date(b.creation).getTime()
  );

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
  {/* # */}
  <TableCell>{index + 1 + (currentPage - 1) * perPage}</TableCell>

  {/* Task Name + Description */}
  <TableCell className="font-medium">
    <div className="flex flex-col gap-2">
      {/* Task Name (with link if present) */}
      {taskName}
    <StatusBadge status={task.status} />
    </div>
  </TableCell>

  {/* Details */}
  <TableCell>
    <div className="flex flex-col text-xs text-gray-600">
      <span><strong>Due Date: </strong> {formattedDueDate}</span>
      <span><strong>Revised Due Date: </strong> {formattedRevisedDueDate}</span>
      {business?.business_name ? (
        <span><strong>Business:</strong>  {business.business_name}</span>
      ) : null}
      <span><strong>Completion Date:</strong> {task.completion_date || "—"}</span>
      <span><strong>Created By:</strong> {task.created_by}</span>
      <span><strong>Assigned To:</strong> {task.assigned_to}</span>
      <span><strong>Effort:</strong>{task.effort ? `${task.effort} hrs` : "—"}</span>
    {/* Description aligned with others */}
    {task?.description && (
      <span className="flex items-center gap-1">
        <strong>Description:</strong>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-auto text-xs text-blue-600 font-normal"
              onClick={(e) => e.stopPropagation()}
            >
              View
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="max-w-md max-h-60 overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap break-words"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: (task.description || "")
                  .replace(/\n+/g, "<br />")
                  .replace(/style="[^"]*"/g, "")
                  .replace(/<img[^>]*>/g, "")
                  .replace(/(<br\s*\/?>\s*){2,}/g, "</p><p>")
                  .replace(/^/, "<p>")
                  .replace(/$/, "</p>"),
              }}
            />
          </PopoverContent>
        </Popover>
      </span>
    )}



    </div>
  </TableCell>

  {/* Assignee Remarks */}
  <TableCell>
    <div
      dangerouslySetInnerHTML={{
        __html: task?.assignee_comments?.replace(/\n+/g, "<br />") || "",
      }}
    />
  </TableCell>

  {/* Comments */}
  <TableCell>
    <div>
      {commentLogsSorted.length > 0
        ? commentLogsSorted.map((log, index) => {
            return <CommentLog log={log} key={index} />;
          })
        : "—"}
    </div>
  </TableCell>

  {/* Actions */}
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

export default TaskRowShrink;

const CommentLog = ({
  log,
}: {
  log: {
    owner: string;
    owner_user_id: string;
    content: string;
    creation: string;
  };
}) => {
  const { data: owner, isLoading } = useJhUser(log?.owner_user_id);
  return (
    <div className="flex gap-4">
      <div className="flex flex-col">
        <span className="font-medium">
          {!isLoading && owner?.full_name ? owner?.full_name : log?.owner}:
        </span>
        <span className="text-xs text-gray-400">
          {log.creation ? format(new Date(log.creation), "dd MMM yyyy") : "—"}
        </span>
      </div>
      <p
        className="text-sm text-gray-600 max-w-md overflow-x-auto"
        dangerouslySetInnerHTML={{
          __html: log.content,
        }}
      ></p>
    </div>
  );
};