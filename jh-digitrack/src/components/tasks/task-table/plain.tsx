import { useState, useCallback } from "react";
import { Table, TableBody } from "@/components/ui/table";
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

export const TaskTable = ({ activeFilter }: TaskTableProps) => {
  // State management
  const [searchQuery, setSearchQuery] = useState("");
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

  // Determine filters based on activeFilter
  const getFilters = () => {
    const filters: TaskFilter[] = [
      ["deleted_at", "is", "not set"],
      ...activeFilters,
    ];

    // Add search filter if search query exists
    if (searchQuery) {
      filters.push(["task_name", "like", `%${searchQuery}%`]);
    }

    // Add filter based on activeFilter
    if (activeFilter === "my-tasks" && currentJHUser) {
      filters.push(["assigned_to", "=", currentJHUser.name]);
      if (!filters.some((filter) => filter[0] === "status"))
        filters.push(["status", "in", ["Open", "In Progress"]]);
      if (!filters.some((filter) => filter[0] === "private"))
        filters.push(["private", "=", "0"]);
    } else if (activeFilter === "created-by-me" && currentUser) {
      filters.push(["owner", "=", currentUser]);
      if (!filters.some((filter) => filter[0] === "status"))
        filters.push(["status", "not in", ["Closed", "Cancelled"]]);
    }

    return filters;
  };

  // Fetch tasks data with server-side filtering
  const {
    data: tasks = [],
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
      "assigned_to.full_name as assigned_to",
      "assigned_to.name as assigned_to_id",
      "created_by",
      "created_by.full_name as created_by",
      "created_by.name as created_by_id",
      "owner",
    ],
    orderBy: {
      field: "`tabJH Tasks Master`.modified",
      order: "desc",
    },
    filters: getFilters() as Filter<Task>[],
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
        <SearchBar value={searchQuery} onChange={handleSearchChange} />
        <ActionButtons onCreateTask={handleCreateTask} />
      </div>

      <FilterButtonsWithComboboxes
        tasks={tasks}
        onFiltersChange={handleFiltersChange}
        showPrivateTaskToggle={activeFilter === "my-tasks"}
        showCreatedByFilter={activeFilter === "my-tasks"}
      />

      {tasks.length > 0 ? (
        <div className="rounded-md border">
          <Table>
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
                />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState />
      )}

      {/* Task creation/edit sheet */}
      <TaskSheet
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        taskId={selectedTaskId}
      />

      {/* Task detail sheet */}
      <TaskDetailSheet
        open={isTaskDetailOpen}
        onOpenChange={setIsTaskDetailOpen}
        taskId={selectedTaskId}
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
