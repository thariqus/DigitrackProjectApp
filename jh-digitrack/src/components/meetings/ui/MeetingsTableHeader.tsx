import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const MeetingsTableHeader = () => (
  <TableHeader>
    <TableRow>
      <TableHead className="w-[50px]">#</TableHead>
      <TableHead>Title</TableHead>
      <TableHead className="w-[150px]">Status</TableHead>
      <TableHead className="w-[150px]">Meeting Date</TableHead>
      <TableHead className="w-[150px]">Organizer</TableHead>
      <TableHead className="w-[100px] text-center">Actions</TableHead>
    </TableRow>
  </TableHeader>
);

export default MeetingsTableHeader;
