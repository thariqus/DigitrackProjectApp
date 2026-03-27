import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Table, TableBody, TableFooter } from "@/components/ui/table";
import { PropertyTableHeader } from "../ui/PropertyTableHeader";
import PropertyTableRow from "../ui/PropertyTableRow";
import PropertySheet from "../ui/PropertySheet";
import SearchBar from "../ui/SearchBar";
import FilterButtons from "../ui/FilterButtons";
import { useDocs } from "@/hooks/doc";
import { PropertyMaster } from "@/types/JHDigitrack/JHPropertyAutomation";
import { Filter } from "frappe-js-sdk/lib/db/types";
import { usePropertyFilters } from "@/components/PropertyAutomation/hooks/usePropertyFilters";
import { PaginationControls } from "../ui/PaginationControls";

function Properties() {
  const [searchQuery, setSearchQuery] = useState("");
  const [tasksPerPage, setTasksPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedEmirate, setSelectedEmirate] = useState<string[]>([]);
 const [selectedType, setSelectedType] = useState<string[]>([]);

  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { filters } = usePropertyFilters({
    searchQuery,
    selectedEmirate,
    selectedType,
  });

  const { data: properties = [], isLoading } = useDocs<PropertyMaster>({
    doctype: "JH Property Master",
    fields: [
      "name",
      "property_name",
      "type_of_property",
      "division_used",
      "booked_under",
      "profit_center",
      "number_of_units",
      "number_of_premises",
      "premise_number",
      "staff_allocated",
      "location",
      "emirate",
      "country",
      "makani_number",
      "po_box_number",
      "po_box_renewal_date",
      "landlord",
      "real_estate",
      "current_rent",
      "renewal_date",
      "landlord_security_deposit",
      "tenancy_period",
      "electricity_accounts",
      "electricity_connection_numbers",
      "electricity_water_security_deposit",
      "landline_numbers",
      "internet_connection",
      "cdc_expiry",
      "hassantuk_expiry",
      "attachments",
    ],
    limit: tasksPerPage,
    page: currentPage,
    filters: filters as Filter<PropertyMaster>[],
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const emirateOptions = useMemo(() => {
    return Array.from(
      new Set(
        properties
          .map((item) => item.emirate)
          .filter(Boolean)
      )
    );
  }, [properties]);

  const typeOptions = useMemo(() => {
    return Array.from(
      new Set(
        properties
          .map((item) => item.type_of_property)
          .filter(Boolean)
      )
    );
  }, [properties]);

  const handleRowClick = (name: string) => {
    setSelectedProperty(name);
    setIsSheetOpen(true);
  };

  const handleCreate = () => {
    setSelectedProperty(null);
    setIsSheetOpen(true);
  };

  const totalPages = Math.ceil(properties?.length / tasksPerPage);

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between gap-3">
        <SearchBar
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search properties..."
        />

        <Button size="sm" onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Property
        </Button>
      </div>

      <FilterButtons
        emirateOptions={emirateOptions}
        typeOptions={typeOptions}
        selectedEmirate={selectedEmirate}
        selectedType={selectedType}
        onEmirateChange={(value: string) => {
        setSelectedEmirate((prev) =>
          prev.includes(value)
            ? prev.filter((item) => item !== value)
            : [...prev, value]
        );
        setCurrentPage(1);
      }}
        onTypeChange={(value: string) => {
          setSelectedType((prev) =>
                        prev.includes(value)
                          ? prev.filter((item) => item !== value)
                          : [...prev, value]
                      );
          setCurrentPage(1);
        }}
        onClear={() => {
          setSelectedEmirate([]); 
          setSelectedType([]);    
          setCurrentPage(1);
        }}  
      />

      <div className="rounded-md border">
        <Table className="w-full table-fixed">
          <PropertyTableHeader />
          <TableBody>
            {properties.map((item, index) => (
              <PropertyTableRow
                key={item.name}
                property={item}
                index={index}
                isLoading={isLoading}
                onClick={() => handleRowClick(item.name)}
              />
            ))}
          </TableBody>
          <TableFooter>
              <PaginationControls
                tasksPerPage={tasksPerPage}
                setTasksPerPage={setTasksPerPage}
                totalPages={totalPages}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
              />
            </TableFooter>
        </Table>
      </div>

      <PropertySheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        // propertyId={selectedProperty}
      />
    </div>
  );
}

export default Properties;