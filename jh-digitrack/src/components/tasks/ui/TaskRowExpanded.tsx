import { TableCell, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Task, TaskRowProps } from "@/types/tasks";
import { StatusBadge } from "./StatusBadge";
import { TaskActions } from "./TaskActions";
import { Link } from "react-router";
import { useDoc, useDocDetail } from "@/hooks/doc";
import { JHBusinessMaster } from "@/types/JHDigitrack/JHBusinessMaster";
import { useJhUser } from "@/hooks/auth";

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

export const TaskRowExpanded = ({
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
      <TableCell>{business?.business_name || "—"}</TableCell>
      <TableCell>{task.completion_date || "—"}</TableCell>
      <TableCell>{task.created_by}</TableCell>
      <TableCell>{task.assigned_to}</TableCell>
      <TableCell>{task.effort ? `${task.effort} hrs` : "—"}</TableCell>
      <TableCell>
        <div
          dangerouslySetInnerHTML={{
            __html: task?.description?.replace(/\n+/g, "<br />") || "",
          }}
        />
      </TableCell>
      <TableCell>
        <div
          dangerouslySetInnerHTML={{
            __html: task?.assignee_comments?.replace(/\n+/g, "<br />") || "",
          }}
        />
      </TableCell>
      <TableCell>
        <div>
          {commentLogsSorted.length > 0
            ? commentLogsSorted.map((log, index) => {
                return <CommentLog log={log} key={index} />;
              })
            : "—"}
        </div>
      </TableCell>
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

export default TaskRowExpanded;

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
