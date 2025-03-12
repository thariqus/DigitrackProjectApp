import { useState, useCallback } from "react";
import { Search, ChevronDown, ChevronRight, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import FilterButtonsWithComboboxes, { TaskFilter } from "../ui/FilterButtons";

// Types
interface Task {
  id: string;
  title: string;
  status: "pending" | "in-progress" | "completed" | "blocked";
  dueDate: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  tasks: Task[];
  reportees: TeamMember[];
}

// Component: StatusBadge
const StatusBadge = ({ status }: { status: Task["status"] }) => {
  const statusConfig = {
    pending: {
      className: "bg-[#FEF9C3] text-[#854D0E] hover:bg-[#FEF9C3]",
      text: "Pending",
    },
    "in-progress": {
      className: "bg-[#FFEDD5] text-[#9A3412] hover:bg-[#FFEDD5]",
      text: "In Progress",
    },
    completed: {
      className: "bg-[#DBEAFE] text-[#1E40AF] hover:bg-[#DBEAFE]",
      text: "Completed",
    },
    blocked: {
      className: "bg-[#FEE2E2] text-[#B91C1C] hover:bg-[#FEE2E2]",
      text: "Blocked",
    },
  };

  return (
    <Badge variant="outline" className={statusConfig[status].className}>
      {statusConfig[status].text}
    </Badge>
  );
};

// Component: TeamMemberRow
const TeamMemberRow = ({
  member,
  isExpanded,
  onToggleExpand,
  onNavigate,
  filteredTasks,
}: {
  member: TeamMember;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onNavigate: () => void;
  filteredTasks: Task[];
}) => (
  <>
    <TableRow className="hover:bg-[#F8FAFC] border-t border-[#E2E8F0]">
      <TableCell className="font-medium">
        <div
          className="flex items-center cursor-pointer"
          onClick={onToggleExpand}
        >
          {member.tasks.length > 0 &&
            (isExpanded ? (
              <ChevronDown className="h-4 w-4 mr-2 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-2 flex-shrink-0" />
            ))}
          {member.name}
        </div>
      </TableCell>
      <TableCell>{member.role}</TableCell>
      <TableCell>
        <div className="flex space-x-2">
          <span>{member.tasks.length} direct tasks</span>
          {member.reportees.length > 0 && (
            <span className="text-[#94A3B8]">
              • {countTotalTasks(member) - member.tasks.length} team tasks
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        {member.reportees.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onNavigate}
            className="cursor-pointer"
            title="View Team"
          >
            <Users className="h-4 w-4 text-[#94A3B8]" />
          </Button>
        )}
      </TableCell>
    </TableRow>

    {/* Collapsible Tasks Section */}
    {isExpanded && member.tasks.length > 0 && (
      <TableRow>
        <TableCell colSpan={4} className="p-0 border-t-0">
          <div className="bg-[#F8FAFC] p-4">
            <h3 className="text-sm font-medium mb-2">{member.name}'s Tasks</h3>
            <div className="rounded-md border border-[#E2E8F0] bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[300px] font-medium text-[#64748B] py-4">
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
                  {filteredTasks.map((task) => (
                    <TableRow
                      key={task.id}
                      className="hover:bg-[#F8FAFC] border-t border-[#E2E8F0]"
                    >
                      <TableCell className="font-medium py-4">
                        {task.title}
                      </TableCell>
                      <TableCell className="py-4">
                        <StatusBadge status={task.status} />
                      </TableCell>
                      <TableCell className="py-4">{task.dueDate}</TableCell>
                    </TableRow>
                  ))}
                  {filteredTasks.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-[#94A3B8] py-4"
                      >
                        No tasks match your filters
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TableCell>
      </TableRow>
    )}
  </>
);

// Component: EmptyTeam
const EmptyTeam = ({ member }: { member: TeamMember }) => (
  <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-8 text-center">
    <h3 className="text-lg font-medium mb-2">No Team Members</h3>
    <p className="text-[#94A3B8]">
      {member.name} doesn't have any direct reports.
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

// Mock data structure
const mockData: TeamMember = {
  id: "1",
  name: "Ajayan",
  role: "Head of Division",
  tasks: [
    {
      id: "t1",
      title: "Strategic Planning",
      status: "in-progress",
      dueDate: "2023-12-15",
    },
    {
      id: "t2",
      title: "Budget Review",
      status: "pending",
      dueDate: "2023-12-20",
    },
    {
      id: "t3",
      title: "Annual Report Preparation",
      status: "pending",
      dueDate: "2023-12-30",
    },
  ],
  reportees: [
    {
      id: "2",
      name: "Priya",
      role: "Engineering Lead",
      tasks: [
        {
          id: "t4",
          title: "Team Performance Review",
          status: "pending",
          dueDate: "2023-12-10",
        },
        {
          id: "t5",
          title: "Project Timeline Update",
          status: "completed",
          dueDate: "2023-12-05",
        },
        {
          id: "t6",
          title: "Architecture Planning",
          status: "in-progress",
          dueDate: "2023-12-18",
        },
      ],
      reportees: [
        {
          id: "5",
          name: "Rahul",
          role: "Senior Developer",
          tasks: [
            {
              id: "t9",
              title: "Fix Authentication Bug",
              status: "in-progress",
              dueDate: "2023-12-08",
            },
            {
              id: "t10",
              title: "Implement New Feature",
              status: "pending",
              dueDate: "2023-12-12",
            },
            {
              id: "t11",
              title: "Code Review",
              status: "completed",
              dueDate: "2023-12-07",
            },
          ],
          reportees: [
            {
              id: "12",
              name: "Amit",
              role: "Junior Developer",
              tasks: [
                {
                  id: "t30",
                  title: "UI Component Development",
                  status: "in-progress",
                  dueDate: "2023-12-14",
                },
                {
                  id: "t31",
                  title: "Unit Test Writing",
                  status: "pending",
                  dueDate: "2023-12-16",
                },
              ],
              reportees: [],
            },
            {
              id: "13",
              name: "Sneha",
              role: "Junior Developer",
              tasks: [
                {
                  id: "t32",
                  title: "API Integration",
                  status: "blocked",
                  dueDate: "2023-12-15",
                },
                {
                  id: "t33",
                  title: "Documentation Update",
                  status: "completed",
                  dueDate: "2023-12-10",
                },
              ],
              reportees: [],
            },
          ],
        },
        {
          id: "6",
          name: "Neha",
          role: "UX Designer",
          tasks: [
            {
              id: "t12",
              title: "UI Redesign",
              status: "in-progress",
              dueDate: "2023-12-15",
            },
            {
              id: "t13",
              title: "Create Design System",
              status: "blocked",
              dueDate: "2023-12-20",
            },
            {
              id: "t14",
              title: "User Testing",
              status: "pending",
              dueDate: "2023-12-22",
            },
          ],
          reportees: [
            {
              id: "14",
              name: "Rohan",
              role: "UI Designer",
              tasks: [
                {
                  id: "t34",
                  title: "Icon Design",
                  status: "completed",
                  dueDate: "2023-12-08",
                },
                {
                  id: "t35",
                  title: "Design Mockups",
                  status: "in-progress",
                  dueDate: "2023-12-18",
                },
              ],
              reportees: [],
            },
          ],
        },
      ],
    },
    {
      id: "3",
      name: "Vikram",
      role: "Product Lead",
      tasks: [
        {
          id: "t15",
          title: "Client Meeting Preparation",
          status: "completed",
          dueDate: "2023-12-07",
        },
        {
          id: "t16",
          title: "Quarterly Report",
          status: "in-progress",
          dueDate: "2023-12-18",
        },
        {
          id: "t17",
          title: "Product Roadmap",
          status: "pending",
          dueDate: "2023-12-25",
        },
      ],
      reportees: [
        {
          id: "7",
          name: "Ananya",
          role: "Product Manager",
          tasks: [
            {
              id: "t18",
              title: "Feature Prioritization",
              status: "in-progress",
              dueDate: "2023-12-10",
            },
            {
              id: "t19",
              title: "Market Research",
              status: "pending",
              dueDate: "2023-12-15",
            },
            {
              id: "t20",
              title: "User Feedback Analysis",
              status: "completed",
              dueDate: "2023-12-05",
            },
          ],
          reportees: [
            {
              id: "15",
              name: "Kiran",
              role: "Business Analyst",
              tasks: [
                {
                  id: "t36",
                  title: "Competitor Analysis",
                  status: "in-progress",
                  dueDate: "2023-12-20",
                },
                {
                  id: "t37",
                  title: "User Journey Mapping",
                  status: "pending",
                  dueDate: "2023-12-22",
                },
              ],
              reportees: [],
            },
          ],
        },
        {
          id: "8",
          name: "Deepak",
          role: "Product Manager",
          tasks: [
            {
              id: "t21",
              title: "Sprint Planning",
              status: "completed",
              dueDate: "2023-12-06",
            },
            {
              id: "t22",
              title: "Stakeholder Updates",
              status: "in-progress",
              dueDate: "2023-12-12",
            },
          ],
          reportees: [],
        },
      ],
    },
    {
      id: "4",
      name: "Sanjay",
      role: "Operations Lead",
      tasks: [],
      reportees: [
        {
          id: "9",
          name: "Meera",
          role: "Operations Manager",
          tasks: [
            {
              id: "t26",
              title: "Vendor Management",
              status: "in-progress",
              dueDate: "2023-12-15",
            },
            {
              id: "t27",
              title: "Cost Optimization",
              status: "pending",
              dueDate: "2023-12-20",
            },
          ],
          reportees: [],
        },
        {
          id: "10",
          name: "Rajesh",
          role: "Quality Assurance",
          tasks: [
            {
              id: "t28",
              title: "Test Plan Creation",
              status: "completed",
              dueDate: "2023-12-08",
            },
            {
              id: "t29",
              title: "Regression Testing",
              status: "in-progress",
              dueDate: "2023-12-16",
            },
          ],
          reportees: [
            {
              id: "16",
              name: "Pooja",
              role: "QA Tester",
              tasks: [
                {
                  id: "t38",
                  title: "Automated Test Scripts",
                  status: "in-progress",
                  dueDate: "2023-12-18",
                },
                {
                  id: "t39",
                  title: "Bug Verification",
                  status: "pending",
                  dueDate: "2023-12-20",
                },
              ],
              reportees: [],
            },
            {
              id: "17",
              name: "Vivek",
              role: "QA Tester",
              tasks: [
                {
                  id: "t40",
                  title: "Performance Testing",
                  status: "blocked",
                  dueDate: "2023-12-22",
                },
                {
                  id: "t41",
                  title: "Test Documentation",
                  status: "completed",
                  dueDate: "2023-12-10",
                },
              ],
              reportees: [],
            },
          ],
        },
      ],
    },
  ],
};

export const TeamTasksTable = () => {
  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(
    new Set()
  );
  const [activeFilters, setActiveFilters] = useState<TaskFilter[]>([]);
  const [hierarchyPath, setHierarchyPath] = useState<TeamMember[]>([mockData]);

  // Current team member being viewed
  const currentMember = hierarchyPath[hierarchyPath.length - 1];

  // Function to navigate to a team member
  const navigateToMember = (member: TeamMember) => {
    setHierarchyPath([...hierarchyPath, member]);
    // Reset expanded state when navigating
    setExpandedMembers(new Set());
  };

  // Function to navigate back in the hierarchy
  const navigateBack = (index: number) => {
    setHierarchyPath(hierarchyPath.slice(0, index + 1));
    // Reset expanded state when navigating
    setExpandedMembers(new Set());
  };

  // Toggle expanded state for a team member
  const toggleExpanded = (memberId: string) => {
    const newExpandedMembers = new Set(expandedMembers);
    if (newExpandedMembers.has(memberId)) {
      newExpandedMembers.delete(memberId);
    } else {
      newExpandedMembers.add(memberId);
    }
    setExpandedMembers(newExpandedMembers);
  };

  const handleFiltersChange = useCallback((filters: TaskFilter[]) => {
    setActiveFilters(filters);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  // Create custom breadcrumb names
  const getBreadcrumbName = (member: TeamMember, index: number) => {
    if (index === 0) return "My Team";
    return member.name;
  };

  // Filter tasks based on search query and filters
  const filterTasks = (tasks: Task[]) => {
    return tasks.filter((task) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter from dropdown
      const hasStatusFilter = activeFilters.some(
        (filter) => filter[0] === "status"
      );
      const matchesStatusFilter = hasStatusFilter
        ? activeFilters.some(
            (filter) => filter[0] === "status" && filter[2] === task.status
          )
        : true;

      // Due date filter
      const hasDueDateFilter = activeFilters.some(
        (filter) => filter[0] === "due_date"
      );
      const matchesDueDate = hasDueDateFilter
        ? activeFilters.some(
            (filter) => filter[0] === "due_date" && filter[2] === task.dueDate
          )
        : true;

      return matchesSearch && matchesStatusFilter && matchesDueDate;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 sm:flex-initial">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 sm:w-[300px]"
          />
        </div>
      </div>

      <FilterButtonsWithComboboxes onFiltersChange={handleFiltersChange} />

      <div className="mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            {hierarchyPath.map((member, index) => (
              <BreadcrumbItem key={member.id}>
                {index < hierarchyPath.length - 1 ? (
                  <BreadcrumbLink
                    onClick={() => navigateBack(index)}
                    className="cursor-pointer"
                  >
                    {getBreadcrumbName(member, index)}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>
                    {getBreadcrumbName(member, index)}
                  </BreadcrumbPage>
                )}
                {index < hierarchyPath.length - 1 && <BreadcrumbSeparator />}
              </BreadcrumbItem>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {currentMember.reportees.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentMember.reportees.map((reportee) => (
                <TeamMemberRow
                  key={reportee.id}
                  member={reportee}
                  isExpanded={expandedMembers.has(reportee.id)}
                  onToggleExpand={() =>
                    reportee.tasks.length > 0
                      ? toggleExpanded(reportee.id)
                      : null
                  }
                  onNavigate={() => navigateToMember(reportee)}
                  filteredTasks={filterTasks(reportee.tasks)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyTeam member={currentMember} />
      )}
    </div>
  );
};

export default TeamTasksTable;
