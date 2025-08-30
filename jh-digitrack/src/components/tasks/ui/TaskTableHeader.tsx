import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TaskTableHeaderProps {
  activeFilter?: string;
  sortField?: string | null;
  sortOrder?: "asc" | "desc";
  onSort?: (field: string, type: "asc" | "desc" | "reset") => void;
}

export const TaskTableHeader = ({
  activeFilter,
  sortField,
  sortOrder,
  onSort,
}: TaskTableHeaderProps) => {
  const handleSort = (field: string, type: "asc" | "desc" | "reset") => {
    if (!onSort) return;
    onSort(field, type);
  };

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => {
    const isActive = sortField === field;
    return (
      <div className="flex items-center gap-1">
        {children}
        <span
          className={isActive ? "text-blue-500 cursor-pointer" : "text-black cursor-pointer"}
          onClick={() =>
            handleSort(field, isActive && sortOrder === "desc" ? "asc" : "desc")
          }
        >
          {isActive ? (sortOrder === "asc" ? "↑" : "↓") : "↓"}
        </span>
        {isActive && (
          <button
            className="ml-1 text-black text-xs"
            onClick={() => handleSort(field, "reset")}
          >
            Reset
          </button>
        )}
      </div>
    );
  };

  return (
    <TableHeader>
      <TableRow>
        {/* Index */}
        <TableHead className="w-[50px]">#</TableHead>

        {/* Task Name */}
        <TableHead className="cursor-pointer">
          <SortableHeader field="task_name">Task</SortableHeader>
        </TableHead>

        {/* Status */}
        <TableHead className="cursor-pointer">
          <SortableHeader field="status">Status</SortableHeader>
        </TableHead>

        {/* Due Date */}
        <TableHead className="cursor-pointer">
          <SortableHeader field="due_date">Due Date / Revised</SortableHeader>
        </TableHead>

        {/* Created By / Assigned To */}
        <TableHead className="cursor-pointer w-[150px]">
          <SortableHeader field={activeFilter === "my-tasks" ? "created_by" : "assigned_to"}>
            {activeFilter === "my-tasks" ? "Created By" : "Assigned To"}
          </SortableHeader>
        </TableHead>

        {/* Actions */}
        <TableHead className="w-[100px] text-center">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
};

export default TaskTableHeader;
