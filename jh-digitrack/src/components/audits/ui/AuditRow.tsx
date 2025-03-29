import { TableCell, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { StatusBadge } from "./StatusBadge";
import { AuditActions } from "./AuditActions";
import { JHAudits } from "@/types/JHDigitrack/JHAudits";
import { useDocs } from "@/hooks/doc";
import { Skeleton } from "@/components/ui/skeleton";

const formatDueDate = (dueDate?: string) => {
  return dueDate ? format(new Date(dueDate), "MMM dd, yyyy") : "No due date";
};

export interface AuditRowProps {
  audit: JHAudits;
  index: number;
  onRowClick: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  hideAssignedTo?: boolean;
  hideDelete?: boolean;
  currentPage?: number;
  perPage?: number;
}

export const AuditRow = ({
  audit,
  index,
  onRowClick,
  onEdit,
  onDelete,
  hideAssignedTo = false,
  currentPage = 1,
  perPage = 10,
}: AuditRowProps) => {
  const formattedDueDate = formatDueDate(audit.start_date);

  const { data: taskCounter, isLoading: isLoadingTaskCounter } = useDocs({
    doctype: "JH Tasks Master",
    fields: ["name"],
    limit: 100,
    filters: [
      ["source_doctype", "=", "JH Audits"],
      ["source", "=", audit.name],
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
      onClick={() => onRowClick(audit.name)}
      key={audit.name}
    >
      <TableCell>{index + 1 + (currentPage - 1) * perPage}</TableCell>
      <TableCell className="font-medium">{audit.audit_name}</TableCell>
      <TableCell>
        <StatusBadge status={audit.status} />
      </TableCell>
      <TableCell>{formattedDueDate}</TableCell>
      {!hideAssignedTo && <TableCell>{audit.created_by}</TableCell>}
      <TableCell className="text-right">
        <AuditActions
          audit={audit}
          onEdit={onEdit}
          onDelete={onDelete}
          hideDelete={taskCounter?.length > 0}
          showRestore={false}
        />
      </TableCell>
    </TableRow>
  );
};

export default AuditRow;
