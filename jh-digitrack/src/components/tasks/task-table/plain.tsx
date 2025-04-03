import { useState, useCallback } from "react";
import { Table, TableBody, TableFooter } from "@/components/ui/table";
import { useDocs, useUpdateDoc } from "@/hooks/doc";
import { toast } from "sonner";
import { Task, TaskTableProps } from "@/types/tasks";
import { TaskSheet } from "../task-sheet";
import { TaskDetailSheet } from "../task-detail-sheet";
import FilterButtonsWithComboboxes, { TaskFilter } from "../ui/FilterButtons";
import SearchBar from "../ui/SearchBar";
import ActionButtons from "../ui/ActionButtons";
import TaskTableHeader from "../ui/TaskTableHeader";
import TaskRow from "../ui/TaskRow";
import EmptyState from "../ui/EmptyState";
import DeleteConfirmation from "../ui/DeleteConfirmation";
import { Filter } from "frappe-js-sdk/lib/db/types";
import { useCurrentJhUser, useCurrentUser } from "@/hooks/auth";
import { format } from "date-fns";
import { PaginationControls } from "./pagination-controls";
import { useTaskFilters } from "./hooks/useTaskFilters";

export const TaskTable = ({
  activeFilter,
  hideFilters,
  hideSearchBar,
  hideCreateTask,
}: TaskTableProps) => {
  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage, setTasksPerPage] = useState(10);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(
    undefined
  );
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
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
    activeFilter,
    currentJHUser,
    currentUser,
  });

  // Fetch tasks data with server-side filtering
  const {
    data: tasks,
    isLoading,
    refetch,
  } = useDocs<Task>({
    doctype: "JH Tasks Master",
    fields: [
      "name",
      "task_name",
      "status",
      "due_date",
      "assigned_to",
      "private",
      "source",
      "source_doctype",
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
    ],
    orderBy: {
      field: "`tabJH Tasks Master`.modified",
      order: "desc",
    },
    limit: tasksPerPage,
    page: currentPage,
    filters: getFilters() as Filter<Task>[],
  });

  const { data: taskCounter } = useDocs<Task>({
    doctype: "JH Tasks Master",
    fields: ["name"],
    limit: 100,
    filters: getFilters() as Filter<Task>[],
  });

  const totalPages = Math.ceil(taskCounter?.length / tasksPerPage);

  // Fetch tasks data with server-side filtering
  const { data: tasksWithoutfilters } = useDocs<Task>({
    doctype: "JH Tasks Master",
    fields: [
      "assigned_to",
      "assigned_to.full_name as assigned_to",
      "assigned_to.name as assigned_to_id",
      "created_by",
      "created_by.full_name as created_by",
      "created_by.name as created_by_id",
    ],
    orderBy: {
      field: "`tabJH Tasks Master`.modified",
      order: "desc",
    },
    filters: getFilters(true) as Filter<Task>[],
  });

  // Delete task mutation

  const updateDoc = useUpdateDoc();

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
  const handleFiltersChange = useCallback(
    (filters: TaskFilter[]) => {
      setActiveFilters(filters);
      refetch();
    },
    [refetch]
  );

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
      {!hideFilters && (
        <FilterButtonsWithComboboxes
          tasks={tasksWithoutfilters.length > 0 ? tasksWithoutfilters : []}
          onFiltersChange={handleFiltersChange}
          showPrivateTaskToggle={activeFilter === "my-tasks"}
          showCreatedByFilter={activeFilter === "my-tasks"}
        />
      )}

      {tasks.length > 0 ? (
        <div className="rounded-md border">
          <Table className="w-full table-fixed">
            <TaskTableHeader activeFilter={activeFilter} />
            <TableBody>
              {tasks.map((task, index) => (
                <TaskRow
                  key={task.name}
                  task={task}
                  index={index}
                  activeFilter={activeFilter}
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
        <EmptyState
          title={
            activeFilter === "deleted-tasks"
              ? "No deleted tasks found"
              : "No tasks found"
          }
        />
      )}

      {/* Task creation/edit sheet */}
      <TaskSheet
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        taskId={selectedTaskId}
        source={tasks?.find((task) => task.name === selectedTaskId)?.source}
        sourceDocType={
          tasks?.find((task) => task.name === selectedTaskId)
            ?.source_doctype as "JH Audits" | "JH TS Projects" | undefined
        }
      />

      {/* Task detail sheet */}
      <TaskDetailSheet
        open={isTaskDetailOpen}
        onOpenChange={setIsTaskDetailOpen}
        taskId={selectedTaskId}
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

export default TaskTable;
