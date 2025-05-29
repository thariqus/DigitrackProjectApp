import { useState, useCallback, useRef, useEffect } from "react";
import { Table, TableBody, TableFooter } from "@/components/ui/table";
import { useDeleteDoc, useDoc, useDocs } from "@/hooks/doc";
import { toast } from "sonner";
import { Task } from "@/types/tasks";
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
import { PaginationControls } from "./pagination-controls";
import { useTaskFilters } from "./hooks/useTaskFilters";
import { useNavigate, useParams } from "react-router";
import StatusBadge from "../ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Download, Eye } from "lucide-react";
import { JHGroupedTaskMaster } from "@/types/JHDigitrack/JHGroupedTaskMaster";
import { MeetingDetailSheet } from "@/components/meetings/meetings-detail-sheet";
import { queryClient } from "@/utils/query-client";
import { JHUserMaster } from "@/types/JHDigitrack/JHUserMaster";
import { format } from "date-fns";
import { useGetTaskCountByStatusBySource } from "@/hooks/task";

export const MeetingTasks = () => {
  const { meetingId } = useParams();
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
  const [showFullAgenda, setShowFullAgenda] = useState(false);
  const [isAgendaOverflowing, setIsAgendaOverflowing] = useState(false);
  const agendaRef = useRef<HTMLDivElement>(null);
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

  const { data: meeting } = useDoc<JHGroupedTaskMaster>({
    doctype: "JH Grouped Task Master",
    name: meetingId!,
  });

  const visibleToAll = meeting?.visible_to_all === 1;

  const { data: organizer } = useDoc<JHUserMaster>({
    doctype: "JH User Master",
    name: meeting?.organizer || "",
    disabled: !meeting?.organizer,
  });

  // Add this effect to check if description is overflowing
  useEffect(() => {
    if (meeting?.agenda) {
      const isOverflowing = meeting?.agenda.length > 350;
      setIsAgendaOverflowing(isOverflowing);
    }
  }, [meeting?.agenda]);

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
    ],
    orderBy: {
      field: "`tabJH Task Master`.modified",
      order: "desc",
    },
    limit: tasksPerPage,
    page: currentPage,
    filters: [
      ["source_doctype", "=", "JH Grouped Task Master"],
      ["source", "=", meetingId!],
      ...(currentJHUser &&
      organizer?.name !== currentJHUser.name &&
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
      ["source_doctype", "=", "JH Grouped Task Master"],
      ["source", "=", meetingId!],
      ...(getFilters() as Filter<Task>[]),
    ],
  });

  const { data: taskCounts } = useGetTaskCountByStatusBySource(
    meetingId,
    currentJHUser?.name,
    organizer?.name,
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
      ["source_doctype", "=", "JH Grouped Task Master"],
      ["source", "=", meetingId!],
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
        queryKey: ["task-counts", meetingId],
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
      <div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight mb-4">
            {meeting?.title}
          </h1>
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status={meeting?.status} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAuditDetailOpen(true)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.open(
                  `/api/method/jh_digitrack.api.meetings.download_csv?meeting_id=${meetingId}`,
                  "_blank"
                );
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
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
        <div className="flex max-w-md items-center justify-between mb-2">
          <div className="text-base">
            <span>Organizer: </span>
            <span className="text-gray-500">
              {organizer?.full_name ?? meeting?.organizer}
            </span>
          </div>
          <div className="flex text-base gap-2">
            <span>Created Date: </span>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-red-500" />
              <span className="text-gray-500">
                {meeting?.creation
                  ? format(new Date(meeting?.creation), "dd MMM yyyy")
                  : "—"}
              </span>
            </div>
          </div>
        </div>
        <div className="mb-2">
          <div className="flex text-base gap-2">
            <span>Meeting Date: </span>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-red-500" />
              <span className="text-gray-500">
                {meeting?.meeting_date
                  ? format(new Date(meeting?.meeting_date), "dd MMM yyyy")
                  : "—"}
              </span>
            </div>
          </div>
        </div>
        <div className="text-base">
          <div
            ref={agendaRef}
            className={`${!showFullAgenda ? "line-clamp-2" : ""}`}
            dangerouslySetInnerHTML={{
              __html: meeting?.agenda?.replace(/\n+/g, "<br />") || "",
            }}
          />
          {isAgendaOverflowing && (
            <Button
              variant="ghost"
              className="text-gray-500 mt-2 h-auto p-0 text-sm"
              onClick={() => setShowFullAgenda(!showFullAgenda)}
            >
              {showFullAgenda ? "Show less" : "See full agenda"}
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SearchBar value={searchQuery} onChange={handleSearchChange} />
          <ActionButtons
            onCreateTask={handleCreateTask}
            disabled={meeting?.status === "Completed"}
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
              <TaskTableHeader />
              <TableBody>
                {tasks.map((task, index) => (
                  <TaskRow
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
          source={meetingId}
          sourceDocType="JH Grouped Task Master"
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
        <MeetingDetailSheet
          open={isAuditDetailOpen}
          onOpenChange={setIsAuditDetailOpen}
          meetingId={meetingId}
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

export default MeetingTasks;
