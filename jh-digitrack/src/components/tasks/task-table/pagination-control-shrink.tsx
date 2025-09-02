import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectTrigger,
} from "@/components/ui/select";
import TablePagination from "../ui/TablePaginationShrink";

type PaginationControlsProps = {
  tasksPerPage: number;
  setTasksPerPage: (value: number) => void;
  totalPages: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
};

export const PaginationControls = ({
  tasksPerPage,
  setTasksPerPage,
  totalPages,
  currentPage,
  setCurrentPage,
}: PaginationControlsProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between w-full px-2 py-2 bg-white text-xs">
      {/* Left: Tasks per page */}
      <div className="flex items-center space-x-2">
        <label htmlFor="tasksPerPage" className="text-[10px] text-muted-foreground">
          Show
        </label>
        <Select
          value={tasksPerPage.toString()}
          onValueChange={(value) => setTasksPerPage(Number(value))}
        >
          <SelectTrigger id="tasksPerPage" className="h-5 w-[60px] text-[10px]">
            <SelectValue placeholder="10" />
          </SelectTrigger>
          <SelectContent className="text-[10px]">
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Right: Pagination */}
      <div className="mt-2 sm:mt-0">
        <TablePagination
          totalPages={totalPages}
          initialPage={currentPage}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>
    </div>
  );
};

export default PaginationControls;
