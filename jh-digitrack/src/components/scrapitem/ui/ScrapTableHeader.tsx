import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ScrapTableHeaderProps {
  onSort: (field: string, type: 'asc' | 'desc' | 'reset') => void;
  sortField: string | null;
  sortOrder: 'asc' | 'desc';
}

export const ScrapTableHeader = ({}: ScrapTableHeaderProps) => (

  <TableHeader>
    <TableRow>
      <TableHead className="w-[50px]">#</TableHead>

      <TableHead className="flex items-center gap-1">Item Name</TableHead>
      <TableHead className="w-[100px]">Status</TableHead>

      <TableHead className="w-[250px]">Details</TableHead>

      <TableHead className="w-[500px]">Description</TableHead>

      
      <TableHead className="w-[100px] text-center">Actions</TableHead>
    </TableRow>
  </TableHeader>
);

