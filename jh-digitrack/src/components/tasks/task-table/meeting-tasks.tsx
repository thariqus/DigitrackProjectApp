import { useState, useCallback, useEffect } from "react";
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
import { ArrowLeft, Calendar, Download, Expand, Eye, Mail } from "lucide-react";
import { JHGroupedTaskMaster } from "@/types/JHDigitrack/JHGroupedTaskMaster";
import { MeetingDetailSheet } from "@/components/meetings/meetings-detail-sheet";
import { queryClient } from "@/utils/query-client";
import { JHUserMaster } from "@/types/JHDigitrack/JHUserMaster";
import { format } from "date-fns";
import {
  useGetTaskCountByStatusBySource,
  useRemindAllTaskBySource,
} from "@/hooks/task";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ExpandableTextByLines } from "@/components/ExpandableTextByLines";
import ConfirmationDialog from "@/components/ConfirmationDialog";

export const MeetingTasks = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();

  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage, setTasksPerPage] = useState(10);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>();

  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [isAuditDetailOpen, setIsAuditDetailOpen] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEmailConfirmationOpen, setIsEmailConfirmationOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | undefined>();
  const [taskNameToDelete, setTaskNameToDelete] = useState<string | undefined>();
  const [activeFilters, setActiveFilters] = useState<TaskFilter[]>([]);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [frontendSortedTasks, setFrontendSortedTasks] = useState<Task[]>([]);
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
    orderBy:
      sortField && sortField !== "created_by" && sortField !== "assigned_to"
        ? { field: `\`tabJH Task Master\`.\`${sortField}\``, order: sortOrder || "asc" }
        : { field: "`tabJH Task Master`.modified", order: "desc" },
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

  const isOrganizer = organizer?.name === currentJHUser?.name;

  const { data: taskCounts } = useGetTaskCountByStatusBySource(
    meetingId,
    currentJHUser?.name,
    organizer?.name,
    visibleToAll
  );

  const totalPages = Math.ceil(taskCounter?.length / tasksPerPage);

  useEffect(() => {
    if (!tasks) return;

    if (sortField === "created_by" || sortField === "assigned_to") {
      const sorted = [...tasks].sort((a, b) => {
        const nameA = ((a as any)[sortField] || "").toLowerCase();
        const nameB = ((b as any)[sortField] || "").toLowerCase();
        if (nameA < nameB) return sortOrder === "asc" ? -1 : 1;
        if (nameA > nameB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
      setFrontendSortedTasks(sorted);
    } else {
      setFrontendSortedTasks(tasks);
    }
  }, [tasks, sortField, sortOrder]);

  // Sorting handler with reset
  const handleSort = useCallback(
    (field: string, type: "asc" | "desc" | "reset") => {
      if (type === "reset") {
        setSortField(null);
        setSortOrder(null);
      } else {
        setSortField(field);
        setSortOrder(type);
      }
      setCurrentPage(1);
    },
    []
  );

  // Delete task mutation

  const deleteDoc = useDeleteDoc();
  const { mutateAsync: remindAll } = useRemindAllTaskBySource();

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
      const task = tasks?.find((task) => task.name === taskId);
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

      await queryClient.invalidateQueries({ queryKey: ["Docs"] });
      await queryClient.invalidateQueries({ queryKey: ["task-counts", meetingId] });
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

  const confirmEmailReminder = useCallback(async () => {
    try {
      await remindAll(meetingId!);
      toast.success("Reminder emails sent successfully");
    } finally {
      setIsEmailConfirmationOpen(false);
    }
  }, []);

  // Handle filters change from FilterButtonsWithComboboxes
  const handleFiltersChange = useCallback(
    (filters: TaskFilter[]) => {
      setActiveFilters(filters);
      refetch();
    },
    [refetch]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      setTimeout(() => refetch(), 300);
    },
    [refetch]
  );

  useEffect(() => {
    refetch();
  }, [sortField, sortOrder, currentPage, tasksPerPage]);

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
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAuditDetailOpen(true)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View Details</TooltipContent>
            </Tooltip>

            <Popover>
              <Tooltip>
                <TooltipTrigger>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>Download</TooltipContent>
              </Tooltip>
              <PopoverContent className="w-24 p-1">
                <div className="flex flex-col space-y-1">
                  <Button
                    variant="ghost"
                    onClick={() => 
                      window.open(
                        `/api/method/jh_digitrack.api.meetings.download_csv?meeting_id=${meetingId}`,
                        "_blank"
                      )
                    }
                  >
                    CSV
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => 
                      window.open(
                        `/api/method/jh_digitrack.api.meetings.download_pdf?meeting_id=${meetingId}&pdf_type=1`,
                        "_blank"
                      )
                    }
                  >
                    PDF 1
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => 
                      window.open(
                        `/api/method/jh_digitrack.api.meetings.download_pdf?meeting_id=${meetingId}&pdf_type=2`,
                        "_blank"
                      )
                    }
                  >
                    PDF 2
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            {isOrganizer ? (
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEmailConfirmationOpen(true)}

                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send Reminder</TooltipContent>
              </Tooltip>
            ) : null}
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("expanded")}
                >
                  <Expand className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Expand</TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
           
            {taskCounts?.message?.map((task, i) => (

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
          <ExpandableTextByLines
            text={meeting?.agenda || ""}
            maxLines={2}
            isHtml={true}
            className="text-base"
            showMoreText="See full agenda"
            showLessText="Show less"
          />
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
          tasks={tasks || []}
          onFiltersChange={handleFiltersChange}
          showPrivateTaskToggle={false}
          showCreatedByFilter={false}
        />

        {frontendSortedTasks.length > 0 ? (
          <div className="rounded-md border">
            <Table className="w-full table-fixed">
              <TaskTableHeader
                sortField={sortField}
                sortOrder={sortOrder || undefined}
                onSort={handleSort}
              />              
              <TableBody>
                {frontendSortedTasks.map((task, index) => (
                  <TaskRow
                    key={task.name}
                    task={task}
                    index={index}
                    onRowClick={() => handleRowClick(task.name)}
                    onEdit={() => handleEditTask(task.name)}
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

        {/* Email confirmation dialog */}
        <ConfirmationDialog
          open={isEmailConfirmationOpen}
          onOpenChange={setIsEmailConfirmationOpen}
          onConfirm={confirmEmailReminder}
          title="Send Reminder Emails"
          message="This will send reminder emails to all assignees."
        />
      </div>
    </div>
  );
};

export default MeetingTasks;
