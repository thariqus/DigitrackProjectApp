import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const TaskTableHeader = ({
  activeFilter,
}: {
  activeFilter?: string;
}) => (
  <TableHeader>
    <TableRow>
      <TableHead className="w-[50px]">#</TableHead>
      <TableHead>Task</TableHead>
      <TableHead className="w-[150px]">Status</TableHead>
      <TableHead className="w-[150px]">Due Date / Revised</TableHead>
      <TableHead className="w-[150px]">
        {activeFilter === "my-tasks" ? "Created By" : "Assigned To"}
      </TableHead>
      <TableHead className="w-[100px] text-center">Actions</TableHead>
    </TableRow>
  </TableHeader>
);

export default TaskTableHeader;
