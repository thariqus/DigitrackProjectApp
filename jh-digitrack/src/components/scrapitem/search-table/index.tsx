import { useState, useCallback } from "react";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { format } from "date-fns";
import EmptyState from "@/components/meetings/ui/EmptyState";
import { PaginationControls } from "@/components/meetings/meetings-table/pagination-controls";
import SearchBar from "../ui/SearchBar";
import ScrapDetailSheet from "../ui/ScrapDetailSheet";
import { useAllScrapItems } from "@/hooks/scrapitem";
import { JHScrapItem } from "@/types/JHDigitrack/JHScrapItem";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_COLORS: Record<string, string> = {
  Available: "bg-green-100 text-green-700",
  Sold: "bg-gray-100 text-gray-600",
  Inactive: "bg-red-100 text-red-600",
};

const formatDate = (date?: string) =>
  date ? format(new Date(date), "MMM dd, yyyy") : "-";

export const SearchScrapTable = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedItem, setSelectedItem] = useState<JHScrapItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data, isLoading } = useAllScrapItems(
    currentPage,
    itemsPerPage,
    searchQuery || undefined,
    "Available"
  );

  const items: JHScrapItem[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / itemsPerPage);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const handleView = useCallback((item: JHScrapItem) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <SearchBar value={searchQuery} onChange={handleSearchChange} />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="rounded-md border">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-16 text-right">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={item.name}>
                  <TableCell>{index + 1 + (currentPage - 1) * itemsPerPage}</TableCell>
                  <TableCell className="font-medium">{item.item_name}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] ?? "bg-muted text-foreground"}`}>
                      {item.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>Date: {formatDate(item.date)}</div>
                    <div>Qty: {item.quantity}</div>
                    {item.location && <div>Location: {item.location}</div>}
                    {item.contact_details && <div>Contact: {item.contact_details}</div>}
                    <div>Employee: {item.employee_name} ({item.employee_id})</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.description || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleView(item)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <PaginationControls
                tasksPerPage={itemsPerPage}
                setTasksPerPage={setItemsPerPage}
                totalPages={totalPages}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
              />
            </TableFooter>
          </Table>
        </div>
      ) : (
        <EmptyState
          title="No idle assets found"
          description="No assets match your search criteria."
        />
      )}

      <ScrapDetailSheet
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        item={selectedItem}
      />
    </div>
  );
};

export default SearchScrapTable;
