import { useState, useCallback, useMemo } from "react";
import { Table, TableBody, TableFooter } from "@/components/ui/table";
import { useDeleteDoc } from "@/hooks/doc";
import { toast } from "sonner";
import { AuditSheet } from "../audits-sheet";
import { AuditDetailSheet } from "../audits-detail-sheet";
import SearchBar from "../ui/SearchBar";
import ActionButtons from "../ui/ActionButtons";
import AuditsTableHeader from "../ui/AuditsTableHeader";
import AuditRow from "../ui/AuditRow";
import EmptyState from "../ui/EmptyState";
import DeleteConfirmation from "../ui/DeleteConfirmation";
import { PaginationControls } from "./pagination-controls";
import { useNavigate } from "react-router";
import { useTeamAudits } from "@/hooks/audits";
import { useCurrentJhUser } from "@/hooks/auth";
import { AuditStatusFilter } from "../ui/AuditStatusFilter";

interface AuditsTableProps {
  hideFilters?: boolean;
  hideSearchBar?: boolean;
  hideCreateTask?: boolean;
}

export const AuditsTable = ({
  hideSearchBar,
  hideCreateTask,
  hideFilters,
}: AuditsTableProps) => {
  const navigate = useNavigate();
  const { data: currentJhUser } = useCurrentJhUser();

  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [auditsPerPage, setAuditsPerPage] = useState(10);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedAuditId, setSelectedAuditId] = useState<string | undefined>(undefined);
  const [isAuditDetailOpen, setIsAuditDetailOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | undefined>(undefined);
  const [taskNameToDelete, setTaskNameToDelete] = useState<string | undefined>(undefined);
  const [statusValues, setStatusValues] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch audits
  const {
    data: auditsResponse,
    isLoading,
    refetch,
  } = useTeamAudits(
    currentJhUser?.name,
    currentPage,
    auditsPerPage,
    searchQuery,
    statusValues
  );

  const audits = auditsResponse?.message?.data;

  const sortedAudits = useMemo(() => {
    if (!audits || !sortField) return audits;

    return [...audits].sort((a, b) => {
      let valA = a[sortField as keyof typeof a];
      let valB = b[sortField as keyof typeof b];

      // Case-insensitive sorting for audit_name
      if (sortField === 'audit_name' && typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA == null) return 1;
      if (valB == null) return -1;
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [audits, sortField, sortOrder]);

  const totalAudits = auditsResponse?.message?.total || 0;
  const totalPages = Math.ceil(totalAudits / auditsPerPage);

  const deleteDoc = useDeleteDoc();

  // Handlers
  const handleCreateTask = useCallback(() => {
    setSelectedAuditId(undefined);
    setIsCreateTaskOpen(true);
  }, []);

  const handleRowClick = useCallback(
    (auditId: string) => {
      navigate(`/jh-digitrack/audits/${auditId}`);
    },
    [navigate]
  );

  const handleEditTask = useCallback((auditId: string) => {
    setSelectedAuditId(auditId);
    setIsCreateTaskOpen(true);
  }, []);

  const handleDeleteTask = useCallback(
    (auditId: string) => {
      const audit = audits?.find((audit) => audit.name === auditId);
      setTaskToDelete(auditId);
      setTaskNameToDelete(audit?.audit_name || "");
      setIsDeleteDialogOpen(true);
    },
    [audits]
  );

  const confirmDeleteTask = useCallback(async () => {
    if (!taskToDelete) return;

    try {
      await deleteDoc.mutateAsync({
        doctype: "JH Audit Master",
        name: taskToDelete,
      });
      toast.success("Audit deleted successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to delete audit");
      console.error(error);
    } finally {
      setIsDeleteDialogOpen(false);
      setTaskToDelete(undefined);
      setTaskNameToDelete(undefined);
    }
  }, [taskToDelete, deleteDoc, refetch]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      setCurrentPage(1);
      setTimeout(() => refetch(), 300);
    },
    [refetch]
  );

  const handleStatusChange = useCallback(() => {
    setCurrentPage(1);
    setTimeout(() => refetch(), 100);
  }, [refetch]);

  const clearFilters = useCallback(() => {
    setStatusValues([]);
    setSearchQuery("");
    setCurrentPage(1);
    setTimeout(() => refetch(), 100);
  }, [refetch]);

  const handleSort = useCallback(
    (field: string, type: 'asc' | 'desc' | 'reset') => {
      setCurrentPage(1);

      if (type === 'reset') {
        setSortField(null);
        setSortOrder('desc');
      } else {
        setSortField(field);
        setSortOrder(type);
      }
    },
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!hideSearchBar && (
            <SearchBar value={searchQuery} onChange={handleSearchChange} />
          )}

          {!hideFilters && (
            <AuditStatusFilter
              handleStatusChange={handleStatusChange}
              clearFilters={clearFilters}
              statusValues={statusValues}
              setStatusValues={setStatusValues}
            />
          )}
        </div>

        {!hideCreateTask && <ActionButtons onCreateTask={handleCreateTask} />}
      </div>

      {!isLoading && sortedAudits?.length && sortedAudits?.length > 0 ? (
        <div className="rounded-md border">
          <Table className="w-full table-fixed">
            <AuditsTableHeader
              onSort={handleSort}
              sortField={sortField}
              sortOrder={sortOrder}
            />
            <TableBody>
              {sortedAudits?.map((task, index) => (
                <AuditRow
                  key={task.name}
                  audit={task}
                  index={index}
                  onRowClick={handleRowClick}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                  currentPage={currentPage}
                  perPage={auditsPerPage}
                />
              ))}
            </TableBody>
            <TableFooter>
              <PaginationControls
                tasksPerPage={auditsPerPage}
                setTasksPerPage={setAuditsPerPage}
                totalPages={totalPages}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
              />
            </TableFooter>
          </Table>
        </div>
      ) : (
        <EmptyState title={"No audits found"} />
      )}

      <AuditSheet
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        auditId={selectedAuditId}
      />

      <AuditDetailSheet
        open={isAuditDetailOpen}
        onOpenChange={setIsAuditDetailOpen}
        auditId={selectedAuditId}
        onDelete={handleDeleteTask}
      />

      <DeleteConfirmation
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        taskName={taskNameToDelete || ""}
        onConfirm={confirmDeleteTask}
      />
    </div>
  );
};

export default AuditsTable;
