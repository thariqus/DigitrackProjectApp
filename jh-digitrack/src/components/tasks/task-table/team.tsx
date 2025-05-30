import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useTeamTasks } from "@/hooks/task";
import { TeamMember } from "@/types/teamtasks";
import { useCurrentJhUser } from "@/hooks/auth";
import TaskRow from "../ui/TaskRow";
import { TaskSheet } from "../task-sheet";
import { TaskDetailSheet } from "../task-detail-sheet";
import { cn } from "@/lib/utils";

// Component: TeamMemberRow
const TeamMemberRow = ({
  member,
  isExpanded,
  onToggleExpand,
  onNavigate,
  handleRowClick,
  handleEditTask,
}: {
  member: TeamMember;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onNavigate: () => void;
  handleRowClick: (taskId: string) => void;
  handleEditTask: (taskId: string) => void;
  handleDeleteTask?: (taskId: string) => void;
}) => {
  return (
    <>
      <TableRow className="hover:bg-[#F8FAFC] border-t border-[#E2E8F0]">
        <TableCell className="font-medium">
          <div
            className={cn(
              "flex items-center",
              isExpanded && "text-primary",
              member?.tasks?.length > 0 && "cursor-pointer"
            )}
            onClick={onToggleExpand}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 mr-2 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-2 flex-shrink-0" />
            )}
            {member.full_name}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex space-x-2">
            <span>{member.tasks.length} direct tasks</span>
          </div>
        </TableCell>
        <TableCell className="text-left">
          {member.reportee_count && member.reportee_count > 0 ? (
            <div>
              <span>{member.reportee_count} team members</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={onNavigate}
                className="cursor-pointer"
                title="View Team"
              >
                <Users className="h-4 w-4 text-[#94A3B8]" />
              </Button>
            </div>
          ) : null}
        </TableCell>
      </TableRow>

      {/* Collapsible Tasks Section */}
      {isExpanded && member?.tasks?.length > 0 && (
        <TableRow>
          <TableCell colSpan={4} className="p-0 border-t-0">
            <div className="bg-[#F8FAFC] p-4">
              <h3 className="text-sm font-medium mb-2">
                {member.full_name}'s Tasks
              </h3>
              <div className="rounded-md border border-[#E2E8F0] bg-white overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-medium text-[#64748B] py-4">
                        #
                      </TableHead>
                      <TableHead className="font-medium text-[#64748B] py-4">
                        Task
                      </TableHead>
                      <TableHead className="font-medium text-[#64748B] py-4">
                        Status
                      </TableHead>
                      <TableHead className="font-medium text-[#64748B] py-4">
                        Due Date / Revised
                      </TableHead>
                      <TableHead className="font-medium text-center text-[#64748B] py-4">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {member.tasks.map((task, index) => (
                      <TaskRow
                        key={task.name}
                        task={task}
                        index={index}
                        activeFilter="created-by-me"
                        onRowClick={handleRowClick}
                        onEdit={handleEditTask}
                        onDelete={() => {}}
                        hideAssignedTo={true}
                        hideDelete={true}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

// Component: EmptyTeam
const EmptyTeam = ({ member }: { member: TeamMember }) => (
  <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-8 text-center">
    <h3 className="text-lg font-medium mb-2">No Team Members</h3>
    <p className="text-[#94A3B8]">
      {member.full_name} doesn't have any direct reports.
    </p>
  </div>
);

export const TeamTasksTable = () => {
  const { data: currentJhUser } = useCurrentJhUser();

  // Track the current manager we're viewing
  const [currentManager, setCurrentManager] = useState<string>("");

  // Update currentManager when user data is available
  useEffect(() => {
    if (currentJhUser?.name) {
      setCurrentManager(currentJhUser.name);
    }
  }, [currentJhUser]);

  // Fetch team data for current manager
  const { data: teamTasks } = useTeamTasks(currentManager || "");

  // State for expanded members
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(
    new Set()
  );

  // Store breadcrumb navigation history
  const [breadcrumbs, setBreadcrumbs] = useState<
    Array<{ id: string; name: string }>
  >([]);

  // Initialize the breadcrumb with current user when data is loaded
  useEffect(() => {
    if (teamTasks && breadcrumbs.length === 0 && currentJhUser?.name) {
      setBreadcrumbs([
        {
          id: currentJhUser.name,
          name: "My Team",
        },
      ]);
    }
  }, [teamTasks, currentJhUser, breadcrumbs.length]);

  // Function to navigate to a team member
  const navigateToMember = (member: TeamMember) => {
    if (!member?.id) return;

    // Update the current manager to fetch their team data
    setCurrentManager(member.id);

    // Add this member to breadcrumbs
    setBreadcrumbs((prev) => [
      ...prev,
      { id: member.id, name: member.full_name || "Team Member" },
    ]);

    // Reset expanded state when navigating
    setExpandedMembers(new Set());
  };

  // Function to navigate back in hierarchy
  const navigateBack = (index: number) => {
    if (!breadcrumbs[index]?.id) return;

    // Get the manager ID at this index
    const managerId = breadcrumbs[index].id;

    // Update current manager
    setCurrentManager(managerId);

    // Update breadcrumbs
    setBreadcrumbs((prev) => prev.slice(0, index + 1));

    // Reset expanded state when navigating
    setExpandedMembers(new Set());
  };

  // Toggle expanded state for a team member
  const toggleExpanded = (memberId: string) => {
    if (!memberId) return;

    setExpandedMembers((prev) => {
      const newExpandedMembers = new Set(prev);
      if (newExpandedMembers.has(memberId)) {
        newExpandedMembers.delete(memberId);
      } else {
        newExpandedMembers.add(memberId);
      }
      return newExpandedMembers;
    });
  };

  // Make sure we're safely accessing the reportees
  const reportees = teamTasks?.message?.reportees || [];

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(
    undefined
  );
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  // const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  // const [taskToDelete, setTaskToDelete] = useState<string | undefined>(
  //   undefined
  // );
  // const [taskNameToDelete, setTaskNameToDelete] = useState<string | undefined>(
  //   undefined
  // );

  const handleRowClick = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setIsTaskDetailOpen(true);
  }, []);

  const handleEditTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setIsCreateTaskOpen(true);
  }, []);

  // const handleDeleteTask = useCallback(
  //   (taskId: string) => {
  //     const task = tasks.find((task) => task.name === taskId);
  //     setTaskToDelete(taskId);
  //     setTaskNameToDelete(task?.task_name || "");
  //     setIsDeleteDialogOpen(true);
  //   },
  //   [tasks]
  // );

  // If team data is not yet loaded, show a loading state
  if (!teamTasks) {
    return <div>Loading team data...</div>;
  }
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <BreadcrumbItem key={`${crumb.id}-${index}`}>
                {index < breadcrumbs.length - 1 ? (
                  <BreadcrumbLink
                    onClick={() => navigateBack(index)}
                    className="cursor-pointer"
                  >
                    {crumb.name}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                )}
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </BreadcrumbItem>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {reportees.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Member</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead className="text-left">Team</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportees.map((reportee) => (
                <TeamMemberRow
                  key={reportee?.id || `reportee-${Math.random()}`}
                  member={reportee}
                  isExpanded={expandedMembers.has(reportee?.id || "")}
                  onToggleExpand={() =>
                    (reportee?.tasks?.length || 0) > 0
                      ? toggleExpanded(reportee?.id || "")
                      : null
                  }
                  onNavigate={() => navigateToMember(reportee)}
                  handleRowClick={handleRowClick}
                  handleEditTask={handleEditTask}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyTeam
          member={{
            id: teamTasks?.message?.id || "",
            full_name: teamTasks?.message?.full_name || "Team Member",
            tasks: teamTasks?.message?.tasks || [],
            reportees: teamTasks?.message?.reportees || [],
          }}
        />
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
        onEdit={handleEditTask}
        // onDelete={handleDeleteTask}
      />
    </div>
  );
};

export default TeamTasksTable;
