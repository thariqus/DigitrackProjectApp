import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const TaskTableHeaderShrink = () => (
<TableHeader>
  <TableRow>
    <TableHead className="w-[50px]">#</TableHead>
    <TableHead className="w-[380px]">Task</TableHead>
    <TableHead className="w-[250px]">Details</TableHead>
    <TableHead className="w-[300px]">Assignee Remarks</TableHead>
    <TableHead className="w-[600px]">Comments</TableHead>
    <TableHead className="w-[100px] text-center">Actions</TableHead>
  </TableRow>
</TableHeader>

);

export default TaskTableHeaderShrink;