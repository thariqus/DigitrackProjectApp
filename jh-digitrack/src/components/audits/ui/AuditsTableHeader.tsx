import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AuditsTableHeaderProps {
  onSort: (field: string, type: 'asc' | 'desc' | 'reset') => void;
  sortField: string | null;
  sortOrder: 'asc' | 'desc';
}

export const AuditsTableHeader = ({ onSort, sortField, sortOrder }: AuditsTableHeaderProps) => (
  <TableHeader>
    <TableRow>
      <TableHead className="w-[50px]">#</TableHead>

      <TableHead className="cursor-pointer">
        <div className="flex items-center gap-1">
          Audit Name
          <span
            className={`ml-1 ${sortField === 'audit_name' ? 'text-blue-500' : 'text-black'}`}
            onClick={() => onSort('audit_name', sortField === 'audit_name' && sortOrder === 'desc' ? 'asc' : 'desc')}
          >
            {sortField === 'audit_name' ? (sortOrder === 'asc' ? '↑' : '↓') : '↓'}
          </span>
          {sortField === 'audit_name' && (
            <button
              className="ml-1 text-black text-xs"
              onClick={() => onSort('audit_name', 'reset')}
            >
              Reset
            </button>
          )}
        </div>
      </TableHead>

      <TableHead className="w-[150px]">Status</TableHead>

      <TableHead className="w-[150px] cursor-pointer">
        <div className="flex items-center gap-1">
          Start Date
          <span
            className={`ml-1 ${sortField === 'start_date' ? 'text-blue-500' : 'text-black'}`}
            onClick={() => onSort('start_date', sortField === 'start_date' && sortOrder === 'desc' ? 'asc' : 'desc')}
          >
            {sortField === 'start_date' ? (sortOrder === 'asc' ? '↑' : '↓') : '↓'}
          </span>
          {sortField === 'start_date' && (
            <button
              className="ml-1 text-black text-xs"
              onClick={() => onSort('start_date', 'reset')}
            >
              Reset
            </button>
          )}
        </div>
      </TableHead>

      <TableHead className="w-[150px]">Created By</TableHead>
      <TableHead className="w-[100px] text-center">Actions</TableHead>
    </TableRow>
  </TableHeader>
);

export default AuditsTableHeader;
