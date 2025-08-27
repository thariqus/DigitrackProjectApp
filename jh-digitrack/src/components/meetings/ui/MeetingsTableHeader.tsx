import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface MeetingsTableHeaderProps {
  onSort: (field: string, type: 'asc' | 'desc' | 'reset') => void;
  sortField: string | null;
  sortOrder: 'asc' | 'desc';
}

export const MeetingsTableHeader = ({ onSort, sortField, sortOrder }: MeetingsTableHeaderProps) => (
  <TableHeader>
    <TableRow>
      <TableHead className="w-[50px]">#</TableHead>

      {/* Title */}
      <TableHead className="cursor-pointer">
        <div className="flex items-center gap-1">
          Title
          <span
            className={`ml-1 ${sortField === 'title' ? 'text-blue-500' : 'text-black'}`}
            onClick={() => onSort('title', sortField === 'title' && sortOrder === 'desc' ? 'asc' : 'desc')}
          >
            {sortField === 'title' ? (sortOrder === 'asc' ? '↑' : '↓') : '↓'}
          </span>
          {sortField === 'title' && (
            <button
              className="ml-1 text-black text-xs"
              onClick={() => onSort('title', 'reset')}
            >
              Reset
            </button>
          )}
        </div>
      </TableHead>

      {/* Status (no sorting) */}
      <TableHead>Status</TableHead>

      {/* Meeting Date */}
      <TableHead className="cursor-pointer">
        <div className="flex items-center gap-1">
          Meeting Date
          <span
            className={`ml-1 ${sortField === 'meeting_date' ? 'text-blue-500' : 'text-black'}`}
            onClick={() => onSort('meeting_date', sortField === 'meeting_date' && sortOrder === 'desc' ? 'asc' : 'desc')}
          >
            {sortField === 'meeting_date' ? (sortOrder === 'asc' ? '↑' : '↓') : '↓'}
          </span>
          {sortField === 'meeting_date' && (
            <button
              className="ml-1 text-black text-xs"
              onClick={() => onSort('meeting_date', 'reset')}
            >
              Reset
            </button>
          )}
        </div>
      </TableHead>

      <TableHead>Organizer</TableHead>
      <TableHead className="w-[100px] text-center">Actions</TableHead>
    </TableRow>
  </TableHeader>
);

