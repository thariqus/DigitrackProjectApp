import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
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

// Component: StatusBadge
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    "In Progress": {
      className: "bg-[#FFEDD5] text-[#9A3412] hover:bg-[#FFEDD5]",
      text: "In Progress",
    },
    Open: {
      className: "bg-green-400 text-white hover:bg-green-400",
      text: "Open",
    },
    Completed: {
      className: "bg-blue-400 text-white hover:bg-blue-400",
      text: "Completed",
    },
    Canceled: {
      className: "bg-red-400 text-white hover:bg-red-400",
      text: "Cancelled",
    },
    Closed: {
      className: "bg-gray-400 text-white hover:bg-gray-400",
      text: "Closed",
    },
    Pending: {
      className: "bg-yellow-400 text-white hover:bg-yellow-400",
      text: "Pending",
    },
  };

  return (
    <Badge
      variant="outline"
      className={
        statusConfig[status as keyof typeof statusConfig]?.className ??
        "bg-gray-400 text-white hover:bg-gray-400"
      }
    >
      {statusConfig[status as keyof typeof statusConfig]?.text ?? status}
    </Badge>
  );
};

// Component: TeamMemberRow
const TeamMemberRow = ({
  member,
  isExpanded,
  onToggleExpand,
  onNavigate,
}: {
  member: TeamMember;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onNavigate: () => void;
}) => {
  console.log({
    member,
  });
  return (
    <>
      <TableRow className="hover:bg-[#F8FAFC] border-t border-[#E2E8F0]">
        <TableCell className="font-medium">
          <div
            className="flex items-center cursor-pointer"
            onClick={onToggleExpand}
          >
            {member?.tasks?.length > 0 &&
              (isExpanded ? (
                <ChevronDown className="h-4 w-4 mr-2 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-2 flex-shrink-0" />
              ))}
            {member.full_name}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex space-x-2">
            <span>{member.tasks.length} direct tasks</span>
            {member?.reportees?.length > 0 && (
              <span className="text-[#94A3B8]">
                • {countTotalTasks(member) - member.tasks.length} team tasks
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right">
          {member.reportee_count && member.reportee_count > 0 ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onNavigate}
              className="cursor-pointer"
              title="View Team"
            >
              <Users className="h-4 w-4 text-[#94A3B8]" />
            </Button>
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
                        Task
                      </TableHead>
                      <TableHead className="font-medium text-[#64748B] py-4">
                        Status
                      </TableHead>
                      <TableHead className="font-medium text-[#64748B] py-4">
                        Due Date
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {member.tasks.map((task) => (
                      <TableRow
                        key={task.name}
                        className="hover:bg-[#F8FAFC] border-t border-[#E2E8F0]"
                      >
                        <TableCell className="font-medium py-4">
                          {task.task_name}
                        </TableCell>
                        <TableCell className="py-4">
                          <StatusBadge status={task.status!} />
                        </TableCell>
                        <TableCell className="py-4">{task.due_date}</TableCell>
                      </TableRow>
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

// Utility function: Count total tasks
const countTotalTasks = (member: TeamMember): number => {
  let count = member.tasks.length;

  member.reportees.forEach((reportee) => {
    count += countTotalTasks(reportee);
  });

  return count;
};

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
                <TableHead className="text-right">Actions</TableHead>
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
    </div>
  );
};

export default TeamTasksTable;
