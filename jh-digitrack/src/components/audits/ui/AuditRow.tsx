import { TableCell, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { StatusBadge } from "./StatusBadge";
import { AuditActions } from "./AuditActions";
import { JHAudits } from "@/types/JHDigitrack/JHAudits";

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
  const isEdited = audit.creation != audit.modified;

  console.log(audit);

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
          hideDelete={isEdited}
          showRestore={false}
        />
      </TableCell>
    </TableRow>
  );
};

export default AuditRow;
