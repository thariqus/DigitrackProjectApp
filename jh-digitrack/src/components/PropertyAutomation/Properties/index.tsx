import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Table, TableBody, TableFooter } from "@/components/ui/table";
import { PropertyTableHeader } from "../ui/PropertyTableHeader";
import PropertyTableRow from "../ui/PropertyTableRow";
import PropertySheet from "../ui/PropertySheet";
import FilterButtons from "../ui/FilterButtons";
import { PropertyMaster } from "@/types/JHDigitrack/JHPropertyAutomation";
import { PaginationControls } from "../ui/PaginationControls";
import SearchBar from "../ui/SearchBar";
import { usePropertyList, useUserAccess } from "../hooks/useProperty";

const tableHeadings = [
  "Property Name",
  "Type",
  "Division",
  "Emirate",
  "Current Rent",
  "Renewal Date",
  "Renewal Status",
];

function Properties() {
  const [searchQuery, setSearchQuery] = useState("");
  const [propertiesPerPage, setPropertiesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
  const [selectedEmirate, setSelectedEmirate] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string[]>([]);
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { data: roleBasedAccess } = useUserAccess();

  const { data: permissionData } = useUserAccess();

  const listParams = useMemo(
    () => ({
      search: searchQuery || undefined,
      emirate: selectedEmirate.length === 1 ? selectedEmirate[0] : undefined,
      type_of_property: selectedType.length === 1 ? selectedType[0] : undefined,
      division: selectedDivision.length === 1 ? selectedDivision[0] : undefined,
      expiring_soon: expiringSoon || undefined,
      limit: propertiesPerPage,
      page: currentPage,
    }),
    [
      searchQuery,
      selectedEmirate,
      selectedType,
      selectedDivision,
      expiringSoon,
      propertiesPerPage,
      currentPage,
    ]
  );

  // history viewing permission
  const hasPermisssionToViewRenewalHistory =  roleBasedAccess?.message?.roles?.includes("JH Property Department") || roleBasedAccess?.message?.has_gl_team_role ||  
                                              roleBasedAccess?.message?.is_approver_1 || roleBasedAccess?.message?.is_approver_2 ||
                                              roleBasedAccess?.message?.is_cfo || roleBasedAccess?.message?.is_md

  const { data: pageResult, isLoading } = usePropertyList(listParams);

  const { data: allResult } = usePropertyList({
    limit: 1000,
    page: 1,
  });

  const properties: PropertyMaster[] = pageResult?.properties ?? [];
  const total: number = pageResult?.total ?? 0;
  const allProperties: PropertyMaster[] = allResult?.properties ?? [];

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const emirateOptions = useMemo(
    () => Array.from(new Set(allProperties.map((p) => p.emirate).filter(Boolean))),
    [allProperties]
  );

  const typeOptions = useMemo(
    () => Array.from(new Set(allProperties.map((p) => p.type_of_property).filter(Boolean))),
    [allProperties]
  );

  const divisionOptions = useMemo(
    () => Array.from(new Set(allProperties.map((p) => p.division_used).filter(Boolean))),
    [allProperties]
  );

  const handleRowClick = (name: string) => {
    setSelectedProperty(name);
    setMode("view");
    setIsSheetOpen(true);
  };

  const handleCreate = () => {
    setSelectedProperty(null);
    setMode("create");
    setIsSheetOpen(true);
  };

  const handleEditClick = (name: string) => {
    setSelectedProperty(name);
    setMode("edit");
    setIsSheetOpen(true);
  };

  const getUrgencyColor = (date?: string) => {
    if (!date) return "text-gray-500";
    const days = (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (days < 30) return "text-red-500";
    if (days < 90) return "text-yellow-500";
    return "text-black-400";
  };

  const getRenewalStatus = (date?: string): string => {
    if (!date) return "Unknown";
    const days = Math.floor((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return "Expired";
    if (days <= 90) return "Expiring Soon";
    return "Active";
  };

  const formatDate = (date?: string) => {
    if (!date) return "";
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${d.getFullYear()}`;
  };

  const totalPages = Math.ceil(total / propertiesPerPage);

  const roles = permissionData?.roles || [];
  const canCreateOrEditProperty =
    roles.includes("JH Property Department") || roles.includes("JH Digitrack Admin");

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between gap-3">
        <SearchBar
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search properties..."
        />

        {canCreateOrEditProperty && (
          <Button size="sm" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Property
          </Button>
        )}
      </div>

      <FilterButtons
        filters={[
          {
            label: "Emirates",
            options: emirateOptions,
            selected: selectedEmirate,
            onChange: (value: string) => {
              setSelectedEmirate((prev) =>
                prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value]
              );
              setCurrentPage(1);
            },
          },
          {
            label: "Type",
            options: typeOptions,
            selected: selectedType,
            onChange: (value: string) => {
              setSelectedType((prev) =>
                prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value]
              );
              setCurrentPage(1);
            },
          },
          {
            label: "Division",
            options: divisionOptions,
            selected: selectedDivision,
            onChange: (value: string) => {
              setSelectedDivision((prev) =>
                prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value]
              );
              setCurrentPage(1);
            },
          },
        ]}
        quickFilter={{
          label: "Expiring Soon",
          active: expiringSoon,
          onToggle: () => {
            setExpiringSoon((prev) => !prev);
            setCurrentPage(1);
          },
        }}
        onClear={() => {
          setSelectedEmirate([]);
          setSelectedType([]);
          setSelectedDivision([]);
          setExpiringSoon(false);
          setCurrentPage(1);
        }}
      />

      <div className="rounded-md border">
        <Table className="w-full table-fixed">
          <PropertyTableHeader
            tableHeadings={tableHeadings}
            canHaveAccess={canCreateOrEditProperty}
          />

          <TableBody>
            {properties.map((item, index) => (
              <PropertyTableRow
                key={item.name}
                property={item}
                index={index}
                isLoading={isLoading}
                onClick={() => handleRowClick(item.name)}
                onEdit={handleEditClick}
                renewalColorHighlight={getUrgencyColor}
                getRenewalStatus={getRenewalStatus}
                formatDate={formatDate}
                canCreateOrEditProperty={canCreateOrEditProperty}
              />
            ))}
          </TableBody>

          <TableFooter>
            <PaginationControls
              datasPerPage={propertiesPerPage}
              setDatasPerPage={setPropertiesPerPage}
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
        propertyId={selectedProperty}
        mode={mode}
        renewalColorHighlight={getUrgencyColor}
        formatDate={formatDate}
        typeOptions={typeOptions}
        hasPermisssionToViewRenewalHistory ={hasPermisssionToViewRenewalHistory}
        
      />
    </div>
  );
}

export default Properties;