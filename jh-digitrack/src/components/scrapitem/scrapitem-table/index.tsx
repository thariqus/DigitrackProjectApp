import { useState, useCallback, useMemo } from "react";
import { Table, TableBody, TableFooter } from "@/components/ui/table";
import ScrapDetailSheet from "../ui/ScrapDetailSheet";
import { JHScrapItem } from "@/types/JHDigitrack/JHScrapItem";
import { toast } from "sonner";
import SearchBar from "../ui/SearchBar";
import EmptyState from "@/components/meetings/ui/EmptyState";
import { PaginationControls } from "@/components/meetings/meetings-table/pagination-controls";
import { useNavigate } from "react-router";
import { useCurrentJhUser } from "@/hooks/auth";
import { useUserScrapItems } from "@/hooks/scrapitem";
import { ScrapTableHeader } from "../ui/ScrapTableHeader";
import ScrapRow from "../ui/ScrapRow";
import ActionButtons from "../ui/ActionButton";
import { ScrapItemSheet } from "../scrapitem_sheet";
import { useDeleteScrapItem  } from "@/hooks/scrapitem";
export const ScrapTable = () => {
  const navigate = useNavigate();
  const { data: currentJhUser } = useCurrentJhUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const {
    data: scrapResponse,
    isLoading,
    refetch,
  } = useUserScrapItems(currentJhUser?.name, currentPage, itemsPerPage, searchQuery);

  const scrapItems = scrapResponse?.message?.data || [];
  const totalItems = scrapResponse?.message?.total || 0;

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const sortedItems = useMemo(() => {
    if (!scrapItems || scrapItems.length === 0) return [];

    if (sortField !== "item_name") return scrapItems;

    return [...scrapItems].sort((a, b) => {
      const valA = (a.item_name ?? "").toString().toLowerCase();
      const valB = (b.item_name ?? "").toString().toLowerCase();

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [scrapItems, sortField, sortOrder]);


  const handleRowClick = useCallback(
    (itemId: string) => {
      navigate(`/jh-digitrack/scrap/${itemId}`);
    },
    [navigate]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      setTimeout(() => refetch(), 300);
    },
    [refetch]
  );

  const handleSort = useCallback((field: string, type: "asc" | "desc" | "reset") => {
    setCurrentPage(1);
    if (type === "reset") {
      setSortField(null);
      setSortOrder("desc");
    } else {
      setSortField(field);
      setSortOrder(type);
    }
  }, []);

const [selectedScrap, setSelectedScrap] = useState<any | undefined>(undefined);
const [viewItem, setViewItem] = useState<JHScrapItem | null>(null);
const [isDetailOpen, setIsDetailOpen] = useState(false);

const handleViewScrap = useCallback((item: JHScrapItem) => {
  setViewItem(item);
  setIsDetailOpen(true);
}, []);

const handleCreateScrap = useCallback(() => {
  setSelectedScrap(undefined);
  setIsSheetOpen(true);
}, []);


const handleEditScrap = useCallback(
  (id: string) => {
    const item = scrapItems.find((s) => s.name === id);
    if (item) {
      setSelectedScrap({
        ...item,
        title: item.item_name,
      });
      setIsSheetOpen(true);
    }
  },
  [scrapItems]
);

const { mutateAsync: deleteScrapItem } = useDeleteScrapItem();

const handleDeleteScrap = useCallback(
  async (id: string) => {
    const item = scrapItems.find((s) => s.name === id);
    if (!item) return;

    if (confirm(`Are you sure you want to delete "${item.item_name}"?`)) {
      try {
        await deleteScrapItem(item.name);
        toast.success(`Idle Asset"${item.item_name}" deleted successfully`);
        refetch();
      } catch (error: any) {
        console.error(error);
        toast.error(error.message || "Failed to delete Idle Asset");
      }
    }
  },
  [scrapItems, refetch, deleteScrapItem]
);


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SearchBar value={searchQuery} onChange={handleSearchChange} />
        <ActionButtons onCreateTask={handleCreateScrap} />
      </div>

      {!isLoading && sortedItems?.length > 0 ? (
        <div className="rounded-md border">
          <Table className="w-full table-fixed">
            <ScrapTableHeader onSort={handleSort} sortField={sortField} sortOrder={sortOrder} />
            <TableBody>
              {sortedItems.map((item, index) => (
                <ScrapRow
                  key={item.name}
                  scrap={item}
                  index={index}
                  currentPage={currentPage}
                  perPage={itemsPerPage}
                  onRowClick={handleRowClick}
                  onEdit={handleEditScrap}
                  onDelete={handleDeleteScrap}
                  onView={handleViewScrap}
                />
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
          description="You don't have any idle assets yet."
        />
      )}

      <ScrapItemSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        initialData={selectedScrap}
        refetch={refetch}
      />

      <ScrapDetailSheet
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        item={viewItem}
      />
    </div>
  );
};

export default ScrapTable;

