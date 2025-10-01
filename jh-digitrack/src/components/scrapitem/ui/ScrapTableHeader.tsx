import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ScrapTableHeaderProps {
  onSort: (field: string, type: 'asc' | 'desc' | 'reset') => void;
  sortField: string | null;
  sortOrder: 'asc' | 'desc';
}

// export const ScrapTableHeader = ({ onSort, sortField, sortOrder }: ScrapTableHeaderProps) => (
export const ScrapTableHeader = ({}: ScrapTableHeaderProps) => (

  <TableHeader>
    <TableRow>
      <TableHead className="w-[50px]">#</TableHead>

      {/* Item Code & Name */}
      {/* <TableHead className="cursor-pointer">
        <div className="flex items-center gap-1">
          Item Code & Name
          <span
            className={`ml-1 ${sortField === 'item_code' ? 'text-blue-500' : 'text-black'}`}
            onClick={() =>
              onSort(
                'item_code',
                sortField === 'item_code' && sortOrder === 'desc' ? 'asc' : 'desc'
              )
            }
          >
            {sortField === 'item_code' ? (sortOrder === 'asc' ? '↑' : '↓') : '↓'}
          </span>
          {sortField === 'item_code' && (
            <button className="ml-1 text-black text-xs" onClick={() => onSort('item_code', 'reset')}>
              Reset
            </button>
          )}
        </div>
      </TableHead> */}
      <TableHead className="flex items-center gap-1">Item Name</TableHead>
      <TableHead className="w-[100px]">Status</TableHead>

      <TableHead className="w-[250px]">Details</TableHead>

      <TableHead className="w-[500px]">Description</TableHead>

      
      <TableHead className="w-[100px] text-center">Actions</TableHead>
    </TableRow>
  </TableHeader>
);

