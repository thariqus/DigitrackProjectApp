import { TableCell, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { StatusBadge } from "./StatusBadge";
import { MeetingActions } from "./MeetingActions";
import { useDocs } from "@/hooks/doc";
import { Skeleton } from "@/components/ui/skeleton";
import { JHGroupedTaskMaster } from "@/types/JHDigitrack/JHGroupedTaskMaster";

const formatDueDate = (dueDate?: string) => {
  return dueDate
    ? format(new Date(dueDate), "MMM dd, yyyy")
    : "No Meeting Date";
};

export interface MeetingRowProps {
  meeting: JHGroupedTaskMaster;
  index: number;
  onRowClick: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  hideAssignedTo?: boolean;
  hideDelete?: boolean;
  currentPage?: number;
  perPage?: number;
}

export const MeetingRow = ({
  meeting,
  index,
  onRowClick,
  onEdit,
  onDelete,
  hideAssignedTo = false,
  currentPage = 1,
  perPage = 10,
}: MeetingRowProps) => {
  const formattedDueDate = formatDueDate(meeting.meeting_date);

  const { data: taskCounter, isLoading: isLoadingTaskCounter } = useDocs({
    doctype: "JH Task Master",
    fields: ["name"],
    limit: 100,
    filters: [
      ["source_doctype", "=", "JH Grouped Task Master"],
      ["source", "=", meeting.name],
    ],
  });

  if (isLoadingTaskCounter) {
    return (
      <TableRow>
        <TableCell>
          <Skeleton className="h-4 w-4" />
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => onRowClick(meeting.name)}
      key={meeting.name}
    >
      <TableCell>{index + 1 + (currentPage - 1) * perPage}</TableCell>
      <TableCell className="font-medium">{meeting.title}</TableCell>
      <TableCell>
        <StatusBadge status={meeting.status} />
      </TableCell>
      <TableCell>{formattedDueDate}</TableCell>
      {!hideAssignedTo && <TableCell>{meeting.organizer}</TableCell>}
      <TableCell className="text-right">
        <MeetingActions
          meeting={meeting}
          onEdit={onEdit}
          onDelete={onDelete}
          hideDelete={taskCounter?.length > 0}
          showRestore={false}
        />
      </TableCell>
    </TableRow>
  );
};

export default MeetingRow;
