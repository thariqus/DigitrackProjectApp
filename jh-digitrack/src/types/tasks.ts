import type { JHTaskMaster } from "./JHDigitrack/JHTaskMaster";

// Re-export the JHTasksMaster type as Task for better naming
export type Task = JHTaskMaster & {
  "assigned_to.full_name as assigned_to": string;
  "assigned_to.name as assigned_to_id": string;
  "created_by.full_name as created_by": string;
  "created_by.name as created_by_id": string;
  assigned_to_id: string;
  created_by_id: string;
};

// Status types with consistent naming
export type TaskStatus =
  | "Open"
  | "In progress"
  | "Canceled"
  | "Completed"
  | "Closed";

// Priority types
export type TaskPriority = "low" | "medium" | "high";

// Filter types
export interface TaskFilter {
  id: string;
  label: string;
  value: string;
  type: "status" | "priority" | "assignee" | "dueDate";
}

// Props for task components
export interface TaskTableProps {
  activeFilter: string;
  currentUser?: string;
  hideFilters?: boolean;
  hideSearchBar?: boolean;
  hideCreateTask?: boolean;
}

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface ActionButtonsProps {
  onCreateTask: () => void;
  disabled?: boolean;
  label?: string;
}

export interface TaskRowProps {
  task: Task;
  index: number;
  activeFilter?: string;
  onRowClick: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  hideAssignedTo?: boolean;
  hideDelete?: boolean;
  currentPage?: number;
  perPage?: number;
}

export interface DeleteConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskToDelete?: string;
  taskName?: string;
  itemLabel?: string;
  onConfirm: () => void;
}

export interface TaskActionsProps {
  task: Task;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  hideDelete?: boolean;
  showRestore?: boolean;
}

// Team task types
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  tasks: Task[];
  reportees: TeamMember[];
}

export interface TeamTasksTableProps {
  currentUser?: string;
}

export interface TeamMemberRowProps {
  member: TeamMember;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onNavigate: () => void;
  filteredTasks: Task[];
}

export interface TaskCounts {
  count: number;
  status: TaskStatus;
}

export interface ConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  message: string;
}
