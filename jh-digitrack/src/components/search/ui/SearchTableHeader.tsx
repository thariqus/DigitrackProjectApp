import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const SearchTableHeader = () => (
  <TableHeader>
    <TableRow>
      <TableHead className="w-[50px]">#</TableHead>
      <TableHead>Task</TableHead>
      <TableHead className="w-[200px]">Created By</TableHead>
      <TableHead className="w-[150px]">Created Date</TableHead>
      <TableHead className="w-[150px]">Status</TableHead>
    </TableRow>
  </TableHeader>
);

export default SearchTableHeader;
