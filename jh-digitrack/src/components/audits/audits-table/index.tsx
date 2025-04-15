import { useState, useCallback } from "react";
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
interface AuditsTableProps {
  hideFilters?: boolean;
  hideSearchBar?: boolean;
  hideCreateTask?: boolean;
}

export const AuditsTable = ({
  hideSearchBar,
  hideCreateTask,
}: AuditsTableProps) => {
  const navigate = useNavigate();
  const { data: currentJhUser } = useCurrentJhUser();
  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [auditsPerPage, setAuditsPerPage] = useState(10);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedAuditId, setSelectedAuditId] = useState<string | undefined>(
    undefined
  );
  const [isAuditDetailOpen, setIsAuditDetailOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | undefined>(
    undefined
  );
  const [taskNameToDelete, setTaskNameToDelete] = useState<string | undefined>(
    undefined
  );
  // Fetch tasks data with server-side filtering
  const {
    data: auditsResponse,
    isLoading,
    refetch,
  } = useTeamAudits(
    currentJhUser?.name,
    currentPage,
    auditsPerPage,
    searchQuery
  );

  const audits = auditsResponse?.message?.data;

  const totalAudits = auditsResponse?.message?.total || 0;

  const totalPages = Math.ceil(totalAudits / auditsPerPage);

  const deleteDoc = useDeleteDoc();

  // Event handlers
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

  // Handle search query change
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      setTimeout(() => refetch(), 300);
    },
    [refetch]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {!hideSearchBar && (
          <SearchBar value={searchQuery} onChange={handleSearchChange} />
        )}
        {!hideCreateTask && <ActionButtons onCreateTask={handleCreateTask} />}
      </div>

      {!isLoading && audits?.length && audits?.length > 0 ? (
        <div className="rounded-md border">
          <Table className="w-full table-fixed">
            <AuditsTableHeader />
            <TableBody>
              {audits?.map((task, index) => (
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

      {/* Audit creation/edit sheet */}
      <AuditSheet
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        auditId={selectedAuditId}
      />

      {/* Audit detail sheet */}
      <AuditDetailSheet
        open={isAuditDetailOpen}
        onOpenChange={setIsAuditDetailOpen}
        auditId={selectedAuditId}
        onDelete={handleDeleteTask}
      />

      {/* Delete confirmation dialog */}
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
