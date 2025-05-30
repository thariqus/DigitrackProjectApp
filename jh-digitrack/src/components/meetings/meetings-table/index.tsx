import { useState, useCallback } from "react";
import { Table, TableBody, TableFooter } from "@/components/ui/table";
import { useDeleteDoc } from "@/hooks/doc";
import { toast } from "sonner";
import { MeetingSheet } from "../meetings-sheet";
import { MeetingDetailSheet } from "../meetings-detail-sheet";
import SearchBar from "../ui/SearchBar";
import ActionButtons from "../ui/ActionButtons";
import MeetingsTableHeader from "../ui/MeetingsTableHeader";
import MeetingRow from "../ui/MeetingRow";
import EmptyState from "../ui/EmptyState";
import DeleteConfirmation from "../ui/DeleteConfirmation";
import { PaginationControls } from "./pagination-controls";
import { useNavigate } from "react-router";
import { useCurrentJhUser } from "@/hooks/auth";
import { useTeamMeetings } from "@/hooks/meetings";
import { MeetingStatusFilter } from "../ui/MeetingStatusFilter";

interface MeetingsTableProps {
  hideFilters?: boolean;
  hideSearchBar?: boolean;
  hideCreateTask?: boolean;
}

export const MeetingsTable = ({
  hideSearchBar,
  hideCreateTask,
  hideFilters,
}: MeetingsTableProps) => {
  const navigate = useNavigate();
  const { data: currentJhUser } = useCurrentJhUser();
  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [meetingsPerPage, setMeetingsPerPage] = useState(10);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<
    string | undefined
  >(undefined);
  const [isMeetingDetailOpen, setIsMeetingDetailOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | undefined>(
    undefined
  );
  const [meetingNameToDelete, setMeetingNameToDelete] = useState<
    string | undefined
  >(undefined);
  const [statusValues, setStatusValues] = useState<string[]>([]);
  // Fetch tasks data with server-side filtering
  const {
    data: meetingsResponse,
    isLoading,
    refetch,
  } = useTeamMeetings(
    currentJhUser?.name,
    currentPage,
    meetingsPerPage,
    searchQuery,
    statusValues
  );

  const meetings = meetingsResponse?.message?.data;

  const totalMeetings = meetingsResponse?.message?.total || 0;

  const totalPages = Math.ceil(totalMeetings / meetingsPerPage);

  const deleteDoc = useDeleteDoc();

  // Event handlers
  const handleCreateTask = useCallback(() => {
    setSelectedMeetingId(undefined);
    setIsCreateTaskOpen(true);
  }, []);

  const handleRowClick = useCallback(
    (meetingId: string) => {
      navigate(`/jh-digitrack/meetings/${meetingId}`);
    },
    [navigate]
  );

  const handleEditTask = useCallback((meetingId: string) => {
    setSelectedMeetingId(meetingId);
    setIsCreateTaskOpen(true);
  }, []);

  const handleDeleteTask = useCallback(
    (meetingId: string) => {
      const meeting = meetings?.find((meeting) => meeting.name === meetingId);
      setTaskToDelete(meetingId);
      setMeetingNameToDelete(meeting?.title || "");
      setIsDeleteDialogOpen(true);
    },
    [meetings]
  );

  const confirmDeleteTask = useCallback(async () => {
    if (!taskToDelete) return;

    try {
      await deleteDoc.mutateAsync({
        doctype: "JH Grouped Task Master",
        name: taskToDelete,
      });
      toast.success("Meeting deleted successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to delete meeting");
      console.error(error);
    } finally {
      setIsDeleteDialogOpen(false);
      setTaskToDelete(undefined);
      setMeetingNameToDelete(undefined);
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

  // Handle status filter change
  const handleStatusChange = useCallback(() => {
    setCurrentPage(1); // Reset to first page on filter change
    setTimeout(() => refetch(), 100);
  }, [refetch]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setStatusValues([]);
    setSearchQuery("");
    setCurrentPage(1);
    setTimeout(() => refetch(), 100);
  }, [refetch]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!hideSearchBar && (
            <SearchBar value={searchQuery} onChange={handleSearchChange} />
          )}

          {!hideFilters && (
            <MeetingStatusFilter
              handleStatusChange={handleStatusChange}
              clearFilters={clearFilters}
              statusValues={statusValues}
              setStatusValues={setStatusValues}
            />
          )}
        </div>
        {!hideCreateTask && <ActionButtons onCreateTask={handleCreateTask} />}
      </div>
      {!isLoading && meetings?.length && meetings?.length > 0 ? (
        <div className="rounded-md border">
          <Table className="w-full table-fixed">
            <MeetingsTableHeader />
            <TableBody>
              {meetings?.map((task, index) => (
                <MeetingRow
                  key={task.name}
                  meeting={task}
                  index={index}
                  onRowClick={handleRowClick}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                  currentPage={currentPage}
                  perPage={meetingsPerPage}
                />
              ))}
            </TableBody>
            <TableFooter>
              <PaginationControls
                tasksPerPage={meetingsPerPage}
                setTasksPerPage={setMeetingsPerPage}
                totalPages={totalPages}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
              />
            </TableFooter>
          </Table>
        </div>
      ) : (
        <EmptyState
          title={"No Meetings / Grouped Tasks found"}
          description="You don't have any meetings / grouped tasks yet. Create one to get started."
        />
      )}

      {/* Meeting creation/edit sheet */}
      <MeetingSheet
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        meetingId={selectedMeetingId}
      />

      {/* Meeting detail sheet */}
      <MeetingDetailSheet
        open={isMeetingDetailOpen}
        onOpenChange={setIsMeetingDetailOpen}
        meetingId={selectedMeetingId}
        onDelete={handleDeleteTask}
      />

      {/* Delete confirmation dialog */}
      <DeleteConfirmation
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        taskName={meetingNameToDelete || ""}
        onConfirm={confirmDeleteTask}
      />
    </div>
  );
};

export default MeetingsTable;
