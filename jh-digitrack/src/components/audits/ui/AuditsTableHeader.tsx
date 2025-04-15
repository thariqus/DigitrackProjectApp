import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const AuditsTableHeader = () => (
  <TableHeader>
    <TableRow>
      <TableHead className="w-[50px]">#</TableHead>
      <TableHead>Audit Name</TableHead>
      <TableHead className="w-[150px]">Status</TableHead>
      <TableHead className="w-[150px]">Start Date</TableHead>
      <TableHead className="w-[150px]">Created By</TableHead>
      <TableHead className="w-[100px] text-center">Actions</TableHead>
    </TableRow>
  </TableHeader>
);

export default AuditsTableHeader;
