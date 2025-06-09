import { useState, useCallback } from "react";
import { Table, TableBody, TableFooter } from "@/components/ui/table";
import { useDeleteDoc, useDoc, useDocs } from "@/hooks/doc";
import { toast } from "sonner";
import { Task } from "@/types/tasks";
import { TaskSheet } from "../task-sheet";
import { TaskDetailSheet } from "../task-detail-sheet";
import FilterButtonsWithComboboxes, { TaskFilter } from "../ui/FilterButtons";
import SearchBar from "../ui/SearchBar";
import ActionButtons from "../ui/ActionButtons";
import TaskTableHeaderExpanded from "../ui/TaskTableHeaderExpanded";
import TaskRowExpanded from "../ui/TaskRowExpanded";
import EmptyState from "../ui/EmptyState";
import DeleteConfirmation from "../ui/DeleteConfirmation";
import { Filter } from "frappe-js-sdk/lib/db/types";
import { useCurrentJhUser, useCurrentUser } from "@/hooks/auth";
import { PaginationControls } from "./pagination-controls";
import { useTaskFilters } from "./hooks/useTaskFilters";
import { useNavigate, useParams } from "react-router";
import { JHAudits } from "@/types/JHDigitrack/JHAudits";
import StatusBadge from "../ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Download, Eye } from "lucide-react";
import { AuditDetailSheet } from "@/components/audits/audits-detail-sheet";
import { queryClient } from "@/utils/query-client";
import { JHBusinessMaster } from "@/types/JHDigitrack/JHBusinessMaster";
import { JHDivisionMaster } from "@/types/JHDigitrack/JHDivisionMaster";
import { JHUserMaster } from "@/types/JHDigitrack/JHUserMaster";
import { format } from "date-fns";
import { useGetTaskCountByStatusBySource } from "@/hooks/task";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export const AuditTasksExpanded = () => {
  const { auditId } = useParams();
  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage, setTasksPerPage] = useState(10);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(
    undefined
  );
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [isAuditDetailOpen, setIsAuditDetailOpen] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | undefined>(
    undefined
  );
  const [taskNameToDelete, setTaskNameToDelete] = useState<string | undefined>(
    undefined
  );
  const [activeFilters, setActiveFilters] = useState<TaskFilter[]>([]);
  const { data: currentJHUser } = useCurrentJhUser();
  const { data: currentUser } = useCurrentUser();

  // Use the new hook for filter logic
  const { getFilters } = useTaskFilters({
    searchQuery,
    activeFilters,
    currentJHUser,
    currentUser,
  });

  // Fetch tasks data with server-side filtering

  const { data: audit } = useDoc<JHAudits>({
    doctype: "JH Audit Master",
    name: auditId!,
  });

  const visibleToAll = audit?.visible_to_all === 1;

  const { data: business } = useDoc<JHBusinessMaster>({
    doctype: "JH Business Master",
    name: audit?.business || "",
    disabled: !audit?.business,
  });

  const { data: division } = useDoc<JHDivisionMaster>({
    doctype: "JH Division Master",
    name: audit?.division || "",
    disabled: !audit?.division,
  });

  const { data: createdBy } = useDoc<JHUserMaster>({
    doctype: "JH User Master",
    name: audit?.created_by || "",
    disabled: !audit?.created_by,
  });

  const {
    data: tasks,
    isLoading,
    refetch,
  } = useDocs<Task>({
    doctype: "JH Task Master",
    fields: [
      "name",
      "task_name",
      "status",
      "due_date",
      "revised_due_date",
      "assigned_to",
      "private",
      "source",
      "serial_number",
      "assigned_to.full_name as assigned_to",
      "assigned_to.name as assigned_to_id",
      "created_by",
      "created_by.full_name as created_by",
      "created_by.name as created_by_id",
      "owner",
      "creation",
      "modified",
      "deleted_at",
      "business_id",
      "completion_date",
      "effort",
      "description",
      "assignee_comments",
    ],
    orderBy: {
      field: "`tabJH Task Master`.modified",
      order: "desc",
    },
    limit: tasksPerPage,
    page: currentPage,
    filters: [
      ["source_doctype", "=", "JH Audit Master"],
      ["source", "=", auditId!],
      ...(currentJHUser &&
      createdBy?.name !== currentJHUser.name &&
      !visibleToAll
        ? [["assigned_to", "=", currentJHUser.name] as Filter<Task>]
        : []),
      ...(getFilters() as Filter<Task>[]),
    ],
  });

  const { data: taskCounter } = useDocs<Task>({
    doctype: "JH Task Master",
    fields: ["name"],
    limit: 100,
    filters: [
      ["source_doctype", "=", "JH Audit Master"],
      ["source", "=", auditId!],
      ...(getFilters() as Filter<Task>[]),
    ],
  });

  const { data: taskCounts } = useGetTaskCountByStatusBySource(
    auditId,
    currentJHUser?.name,
    createdBy?.name,
    visibleToAll
  );

  const totalPages = Math.ceil(taskCounter?.length / tasksPerPage);

  // Fetch tasks data with server-side filtering
  const { data: tasksWithoutfilters } = useDocs<Task>({
    doctype: "JH Task Master",
    fields: [
      "assigned_to",
      "assigned_to.full_name as assigned_to",
      "assigned_to.name as assigned_to_id",
      "created_by",
      "created_by.full_name as created_by",
      "created_by.name as created_by_id",
    ],
    orderBy: {
      field: "`tabJH Task Master`.modified",
      order: "desc",
    },
    filters: [
      ["source_doctype", "=", "JH Audit Master"],
      ["source", "=", auditId!],
      ...(getFilters(true) as Filter<Task>[]),
    ],
  });

  // Delete task mutation

  const deleteDoc = useDeleteDoc();

  // Event handlers
  const handleCreateTask = useCallback(() => {
    setSelectedTaskId(undefined);
    setIsCreateTaskOpen(true);
  }, []);

  const handleRowClick = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setIsTaskDetailOpen(true);
  }, []);

  const handleEditTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setIsCreateTaskOpen(true);
  }, []);

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      const task = tasks.find((task) => task.name === taskId);
      setTaskToDelete(taskId);
      setTaskNameToDelete(task?.task_name || "");
      setIsDeleteDialogOpen(true);
    },
    [tasks]
  );

  const confirmDeleteTask = useCallback(async () => {
    if (!taskToDelete) return;

    try {
      // await updateDoc.mutateAsync({
      //   doctype: "JH Task Master",
      //   name: taskToDelete,
      //   doc: {
      //     deleted_at: format(new Date(), "yyyy-MM-dd"),
      //   },
      // });

      await deleteDoc.mutateAsync({
        doctype: "JH Task Master",
        name: taskToDelete,
      });

      await queryClient.invalidateQueries({
        queryKey: ["Docs"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["task-counts", auditId],
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
  }, [taskToDelete, deleteDoc, refetch]);

  // Handle filters change from FilterButtonsWithComboboxes
  const handleFiltersChange = useCallback(
    (filters: TaskFilter[]) => {
      setActiveFilters(filters);
      refetch();
    },
    [refetch]
  );

  const navigate = useNavigate();
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
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {audit?.audit_name}
          </h1>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge status={audit?.status} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAuditDetailOpen(true)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-24 p-1">
                <div className="flex flex-col space-y-1">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      window.open(
                        `/api/method/jh_digitrack.api.audits.download_csv?audit_id=${auditId}`,
                        "_blank"
                      );
                    }}
                  >
                    CSV
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      window.open(
                        `/api/method/jh_digitrack.api.audits.download_pdf?audit_id=${auditId}`,
                        "_blank"
                      );
                    }}
                  >
                    PDF
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-2">
            {taskCounts?.message
              // .filter(
              //   (task) => task.status === "Open" || task.status === "Closed"
              // )
              .map((task, i) => (
                <div className="flex bg-gray-200 rounded-md" key={i}>
                  <StatusBadge status={task.status} />
                  <StatusBadge status={task.count.toString()} />
                </div>
              ))}
          </div>
        </div>
        <div className="flex text-base gap-2">
          <span>Created By : </span>
          <span className="text-gray-500">
            {createdBy?.full_name ?? audit?.created_by}
          </span>
        </div>
        <div className="flex text-base gap-2">
          <span>Created Date: </span>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-red-500" />
            <span className="text-gray-500">
              {audit?.creation
                ? format(new Date(audit?.creation), "dd MMM yyyy")
                : "—"}
            </span>
          </div>
        </div>
        <div className="flex text-base gap-2">
          <span>Start Date: </span>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-red-500" />
            <span className="text-gray-500">
              {audit?.start_date
                ? format(new Date(audit?.start_date), "dd MMM yyyy")
                : "—"}
            </span>
          </div>
        </div>
        <div className="flex text-base gap-2">
          <span>Business / Division : </span>
          <div className="text-base text-gray-500">
            <span>{business?.business_name || ""}</span>
            {business?.business_name && division?.division_name ? " / " : ""}
            <span>{division?.division_name || ""}</span>
          </div>
        </div>
        <div className="flex text-base gap-2">
          <span>Completion Date: </span>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-red-500" />
            <span className="text-gray-500">
              {audit?.completion_date
                ? format(new Date(audit?.completion_date), "dd MMM yyyy")
                : "—"}
            </span>
          </div>
        </div>
        <div className="text-base">
          <span className="font-semibold">Description</span>
          <div
            dangerouslySetInnerHTML={{
              __html: audit?.audit_description?.replace(/\n+/g, "<br />") || "",
            }}
          />
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SearchBar value={searchQuery} onChange={handleSearchChange} />
          <ActionButtons
            onCreateTask={handleCreateTask}
            disabled={audit?.status === "Completed"}
          />
        </div>
        <FilterButtonsWithComboboxes
          tasks={tasksWithoutfilters.length > 0 ? tasksWithoutfilters : []}
          onFiltersChange={handleFiltersChange}
          showPrivateTaskToggle={false}
          showCreatedByFilter={false}
        />

        {tasks.length > 0 ? (
          <div className="rounded-md border">
            <Table className="w-full table-fixed">
              <TaskTableHeaderExpanded />
              <TableBody>
                {tasks.map((task, index) => (
                  <TaskRowExpanded
                    key={task.name}
                    task={task}
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
          <EmptyState title={"No tasks found"} />
        )}

        {/* Task creation/edit sheet */}
        <TaskSheet
          open={isCreateTaskOpen}
          onOpenChange={setIsCreateTaskOpen}
          taskId={selectedTaskId}
          source={auditId}
          sourceDocType="JH Audit Master"
        />

        {/* Task detail sheet */}
        <TaskDetailSheet
          open={isTaskDetailOpen}
          onOpenChange={setIsTaskDetailOpen}
          taskId={selectedTaskId}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
        />

        {/* Audit detail sheet */}
        <AuditDetailSheet
          open={isAuditDetailOpen}
          onOpenChange={setIsAuditDetailOpen}
          auditId={auditId}
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
    </div>
  );
};

export default AuditTasksExpanded;
