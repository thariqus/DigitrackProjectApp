import { useState, useCallback } from "react";
import { Table, TableBody, TableFooter } from "@/components/ui/table";
import { useDocs, useUpdateDoc } from "@/hooks/doc";
import { toast } from "sonner";
import { AuditSheet } from "../audits-sheet";
import { AuditDetailSheet } from "../audits-detail-sheet";
// import { TaskFilter } from "../ui/FilterButtons";
import SearchBar from "../ui/SearchBar";
import ActionButtons from "../ui/ActionButtons";
import AuditsTableHeader from "../ui/AuditsTableHeader";
import AuditRow from "../ui/AuditRow";
import EmptyState from "../ui/EmptyState";
import DeleteConfirmation from "../ui/DeleteConfirmation";
// import { Filter } from "frappe-js-sdk/lib/db/types";
import { format } from "date-fns";
import { PaginationControls } from "./pagination-controls";
// import { useAuditsFilters } from "./hooks/useTaskFilters";
import { JHAudits } from "@/types/JHDigitrack/JHAudits";
import { useNavigate } from "react-router";
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
  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage, setTasksPerPage] = useState(10);
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
  // const [activeFilters] = useState<TaskFilter[]>([]);

  // Use the new hook for filter logic
  // const { getFilters } = useAuditsFilters({
  //   searchQuery,
  //   activeFilters,
  // });

  // Fetch tasks data with server-side filtering
  const {
    data: audits,
    isLoading,
    refetch,
  } = useDocs<JHAudits>({
    doctype: "JH Audits",
    fields: [
      "name",
      "audit_name",
      "audit_description",
      "status",
      "start_date",
      "created_by.full_name as created_by",
      "created_by.name as created_by_id",
    ],
    orderBy: {
      field: "`tabJH Audits`.modified",
      order: "desc",
    },
    limit: tasksPerPage,
    page: currentPage,
    // filters: getFilters() as Filter<JHAudits>[],
  });

  const { data: taskCounter } = useDocs<JHAudits>({
    doctype: "JH Audits",
    fields: ["name"],
    limit: 100,
    // filters: getFilters() as Filter<JHAudits>[],
  });

  const totalPages = Math.ceil(taskCounter?.length / tasksPerPage);

  // Fetch tasks data with server-side filtering
  // const { data: tasksWithoutfilters } = useDocs<JHAudits>({
  //   doctype: "JH Audits",
  //   fields: [
  //     "created_by",
  //     "created_by.full_name as created_by",
  //     "created_by.name as created_by_id",
  //   ],
  //   orderBy: {
  //     field: "`tabJH Tasks Master`.modified",
  //     order: "desc",
  //   },
  //   filters: getFilters(true) as Filter<Task>[],
  // });

  // Delete task mutation

  const updateDoc = useUpdateDoc();

  // Event handlers
  const handleCreateTask = useCallback(() => {
    setSelectedAuditId(undefined);
    setIsCreateTaskOpen(true);
  }, []);

  const handleRowClick = useCallback(
    (auditId: string) => {
      navigate(`/jh-digitrack/audits/${auditId}`);
      // setSelectedAuditId(auditId);
      // setIsTaskDetailOpen(true);
    },
    [navigate]
  );

  const handleEditTask = useCallback((auditId: string) => {
    setSelectedAuditId(auditId);
    setIsCreateTaskOpen(true);
  }, []);

  const handleDeleteTask = useCallback(
    (auditId: string) => {
      const audit = audits.find((audit) => audit.name === auditId);
      setTaskToDelete(auditId);
      setTaskNameToDelete(audit?.name || "");
      setIsDeleteDialogOpen(true);
    },
    [audits]
  );

  const confirmDeleteTask = useCallback(async () => {
    if (!taskToDelete) return;

    try {
      await updateDoc.mutateAsync({
        doctype: "JH Tasks Master",
        name: taskToDelete,
        doc: {
          deleted_at: format(new Date(), "yyyy-MM-dd"),
        },
      });
      toast.success("Task deleted successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to delete task");
      console.error(error);
    } finally {
      setIsDeleteDialogOpen(false);
      setTaskToDelete(undefined);
      setTaskNameToDelete(undefined);
    }
  }, [taskToDelete, updateDoc, refetch]);

  // Handle filters change from FilterButtonsWithComboboxes
  // const handleFiltersChange = useCallback(
  //   (filters: TaskFilter[]) => {
  //     setActiveFilters(filters);
  //     refetch();
  //   },
  //   [refetch]
  // );

  // Handle search query change
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      setTimeout(() => refetch(), 300);
    },
    [refetch]
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {!hideSearchBar && (
          <SearchBar value={searchQuery} onChange={handleSearchChange} />
        )}
        {!hideCreateTask && <ActionButtons onCreateTask={handleCreateTask} />}
      </div>
      {/* {!hideFilters && (
          <FilterButtonsWithComboboxes
            tasks={tasksWithoutfilters.length > 0 ? tasksWithoutfilters : []}
            onFiltersChange={handleFiltersChange}
          />
        )} */}

      {audits.length > 0 ? (
        <div className="rounded-md border">
          <Table className="w-full table-fixed">
            <AuditsTableHeader />
            <TableBody>
              {audits.map((task, index) => (
                <AuditRow
                  key={task.name}
                  audit={task}
                  index={index}
                  onRowClick={handleRowClick}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                  currentPage={currentPage}
                  perPage={tasksPerPage}
                />
              ))}
            </TableBody>
            <TableFooter>
              <PaginationControls
                tasksPerPage={tasksPerPage}
                setTasksPerPage={setTasksPerPage}
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
        onEdit={handleEditTask}
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
