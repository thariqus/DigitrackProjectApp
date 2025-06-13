import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const TaskTableHeaderExpanded = () => (
  <TableHeader>
    <TableRow>
      <TableHead className="w-[50px]">#</TableHead>
      <TableHead className="w-[400px]">Task</TableHead>
      <TableHead className="w-[100px]">Status</TableHead>
      <TableHead className="w-[150px]">Due Date / Revised</TableHead>
      <TableHead className="w-[150px]">Business</TableHead>
      <TableHead className="w-[150px]">Completion Date</TableHead>
      <TableHead className="w-[150px]">Created By</TableHead>
      <TableHead className="w-[150px]">Assigned To</TableHead>
      <TableHead className="w-[150px]">Effort</TableHead>
      <TableHead className="w-[400px]">Description</TableHead>
      <TableHead className="w-[400px]">Assignee Remarks</TableHead>
      <TableHead className="w-[600px]">Comments</TableHead>
      <TableHead className="w-[100px] text-center">Actions</TableHead>
    </TableRow>
  </TableHeader>
);

export default TaskTableHeaderExpanded;
