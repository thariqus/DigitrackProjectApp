import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Table, TableBody, TableFooter } from "@/components/ui/table";
import { PropertyTableHeader } from "../ui/PropertyTableHeader";
import FilterButtons from "../ui/FilterButtons";
import { useDocs } from "@/hooks/doc";
import { RentalRenewal } from "@/types/JHDigitrack/JHPropertyAutomation";
import { Filter } from "frappe-js-sdk/lib/db/types";
import { PaginationControls } from "../ui/PaginationControls";
import SearchBar from "../ui/SearchBar";
import RenewalTableRow from "../ui/RenewalTableRow";
import { useRenewalFilters } from "../hooks/useRenewalFilters";
import PropertySheet from "../ui/PropertySheet";
import { useOutletContext } from "react-router";
import RenewalSheet from "../ui/RenewalSheet";

type ContextType = {
  currentJhUser:any;
};

function Renewals() {

  const [searchQuery, setSearchQuery] = useState("");
  const [renewalsPerPage, setRenewalsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");

  const [selectedWorkflowStage, setSelectedWorkflowStage] = useState<string[]>([]);
  const [selectedRenewalDateRange, setSelectedRenewalDateRange] = useState<string[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string[]>([]);
  const [pendingMyAction, setPendingMyAction] = useState(false);

  const [selectedRenewal, setSelectedRenewal] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { currentJhUser } = useOutletContext<ContextType>();

  const { filters } = useRenewalFilters({
    searchQuery,
    selectedWorkflowStage,
    selectedRenewalDateRange,
    selectedDivision,
    PendingMyAction: pendingMyAction,
    currentJhUser,
  });

  const tableHeadings = [
    "Renewal ID",
    "Property Name",
    "Division",
    "Current Rent",
    "Proposed Rent",
    "Rent Change %",
    "Renewal Period",
    "Workflow Stage",
    "Last Updated",
  ];

  const { data: renewals = [], isLoading } = useDocs<RentalRenewal>({
    doctype: "JH Property Rental Renewal",
    fields: [
      "name",
      "property",
      "current_rent",
      "proposed_rent",
      "rent_change_percent",
      "renewal_from",
      "renewal_to",
      "division",
      "workflow_state",
      "modified",
    ],
    limit: renewalsPerPage,
    page: currentPage,
    filters: filters as Filter<RentalRenewal>[],
    orderBy: {
      field: "`tabJH Property Rental Renewal`.`modified`",
      order: "asc",
    },
  });

  console.log(renewals,"renewals")

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const { data: allRenewals = [] } = useDocs<RentalRenewal>({
    doctype: "JH Property Rental Renewal",
    fields: ["workflow_state", "division"],
    limit: 1000,
  });

  const workflowOptions = useMemo(() => {
    return Array.from(
      new Set(allRenewals.map((item) => item.workflow_state || '').filter(Boolean) as string[])
    );
  }, [allRenewals]);

  const divisionOptions = useMemo(() => {
    return Array.from(
      new Set(allRenewals.map((item) => item.division || '').filter(Boolean) as string[])
    );
  }, [allRenewals]);

  const handleRowClick = (name: string) => {
    setSelectedRenewal(name);
    setMode("view");
    setIsSheetOpen(true);
  };

  const handleCreate = () => {
    setSelectedRenewal(null);
    setMode("create");
    setIsSheetOpen(true);
  };

  const handleEditClick = (name: string) => {
    setSelectedRenewal(name);
    setMode("edit");
    setIsSheetOpen(true);
  };

  const formatDate = (date?: string) => {
    if (!date) return "";
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, "0")}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${d.getFullYear()}`;
  };

  const { data: renewalsCounter = [] } = useDocs<RentalRenewal>({
    doctype: "JH Property Rental Renewal",
    fields: ["name"],
    limit: 1000,
    filters: filters as Filter<RentalRenewal>[],
  });

  const totalPages = Math.ceil(renewalsCounter.length / renewalsPerPage);

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between gap-3">
        {/* <SearchBar
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search renewals..."
        /> */}
      </div>

      <FilterButtons
        filters={[
          {
            label: "Workflow Stage",
            options: workflowOptions,
            selected: selectedWorkflowStage,
            onChange: (value) => {
              setSelectedWorkflowStage((prev) =>
                prev.includes(value)
                  ? prev.filter((item) => item !== value)
                  : [...prev, value]
              );
              setCurrentPage(1);
            },
          },
          {
            label: "Division",
            options: divisionOptions,
            selected: selectedDivision,
            onChange: (value) => {
              setSelectedDivision((prev) =>
                prev.includes(value)
                  ? prev.filter((item) => item !== value)
                  : [...prev, value]
              );
              setCurrentPage(1);
            },
          },
          {
            label: "Renewal Period",
            options: ["This Month", "Next 3 Months", "This Year"],
            selected: selectedRenewalDateRange,
            onChange: (value) => {
              setSelectedRenewalDateRange((prev) =>
                prev.includes(value)
                  ? prev.filter((item) => item !== value)
                  : [...prev, value]
              );
              setCurrentPage(1);
            },
          },
        ]}
        quickFilter={{
          label: "Pending My Action",
          active: pendingMyAction,
          onToggle: () => {
            setPendingMyAction((prev) => !prev);
            setCurrentPage(1);
          },
        }}
        onClear={() => {
          setSelectedWorkflowStage([]);
          setSelectedRenewalDateRange([]);
          setSelectedDivision([]);
          setPendingMyAction(false);
          setCurrentPage(1);
        }}
      />

      <div className="rounded-md border">
        <Table className="w-full table-fixed">
          <PropertyTableHeader tableHeadings={tableHeadings} />

          <TableBody>
            {renewals.map((item, index) => (
                <RenewalTableRow
                key={item.name}
                renewals={item}
                index={index}
                isLoading={isLoading}
                onClick={() => handleRowClick(item.name)}
                onEdit={handleEditClick}
                formatDate={formatDate}
                renewalColorHighlight={undefined}
              />
            ))}
          </TableBody>

          <TableFooter>
            <PaginationControls
              datasPerPage={renewalsPerPage}
              setDatasPerPage={setRenewalsPerPage}
              totalPages={totalPages}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
          </TableFooter>
        </Table>
      </div>

      <RenewalSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        propertyId={selectedRenewal}
        mode={mode}
        formatDate={formatDate}
        workflowColorHighlight={() => 'text-black'}
        typeOptions={[]}
      />
    </div>
  );
}

export default Renewals;