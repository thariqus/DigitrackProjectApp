import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectTrigger,
} from "@/components/ui/select";
import TablePagination from "../ui/TablePagination";

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
}: PaginationControlsProps) => (
  <div className="flex flex-col sm:flex-row items-center justify-between w-full px-2 py-4 bg-white">
    <div className="flex items-center space-x-6">
      <div className="flex items-center space-x-2">
        <label htmlFor="tasksPerPage" className="text-sm text-muted-foreground">
          Show
        </label>
        <Select
          value={tasksPerPage.toString()}
          onValueChange={(value) => setTasksPerPage(Number(value))}
        >
          <SelectTrigger id="tasksPerPage" className="h-8 w-[70px]">
            <SelectValue placeholder="10" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <TablePagination
        totalPages={totalPages}
        initialPage={currentPage}
        currentPage={currentPage}
        onPageChange={(page) => setCurrentPage(page)}
      />
    </div>
  </div>
);
