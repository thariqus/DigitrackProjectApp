import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Table, TableBody, TableFooter } from "@/components/ui/table";
import { PropertyTableHeader } from "../ui/PropertyTableHeader";
import PropertyTableRow from "../ui/PropertyTableRow";
import PropertySheet from "../ui/PropertySheet";
import FilterButtons from "../ui/FilterButtons";
import { useDocs } from "@/hooks/doc";
import { PropertyMaster } from "@/types/JHDigitrack/JHPropertyAutomation";
import { Filter } from "frappe-js-sdk/lib/db/types";
import { usePropertyFilters } from "@/components/PropertyAutomation/hooks/usePropertyFilters";
import { PaginationControls } from "../ui/PaginationControls";
import SearchBar from "../ui/SearchBar";
import { useOutletContext } from "react-router";

type ContextType = {
  propertyRole: any;
};

const tableHeadings = [
  "Property Name",
  "Type",
  "Division",
  "Emirate",
  "Current Rent",
  "Renewal Date",
  "Renewal Status"
]

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
  const [createOrEditPermission,setCreateOrEditPermission] = useState([]);

  // permission access for particular user
  useEffect(() => {
  const fetchRole = async () => {
    try {
      const res = await fetch(
        "/api/method/jh_digitrack.api.property_management.get_logged_in_property_user",
        {
          credentials: "include",
        }
      );

      const data = await res.json();
      setCreateOrEditPermission(data);
    } catch (error) {
      console.error(error);
    }
  };

  fetchRole();
}, []);

  const { filters} = usePropertyFilters({
    searchQuery,
    selectedEmirate,
    selectedType,
    selectedDivision,
    expiringSoon
  });

  const { data: properties = [], isLoading } = useDocs<PropertyMaster>({
    doctype: "JH Property Master",
fields: [
      "name",
      "property_name",
      "type_of_property",
      "division_used",
      "approver_1",
      "approver_2",
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
      "documents"
    ],
    limit: propertiesPerPage,
    page: currentPage,
    filters: filters as Filter<PropertyMaster>[],
    orderBy: {
    field: "`tabJH Property Master`.`renewal_date`",
    order: "asc",
},
  });

  console.log(properties,"prop")
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const { data: allProperties = [] } = useDocs<PropertyMaster>({
    doctype: "JH Property Master",
    fields: ["emirate", "type_of_property", "division_used","property_name","landlord"],
    limit: 1000,
  });


  const emirateOptions = useMemo(() => {
    return Array.from(
      new Set(allProperties.map((item) => item.emirate).filter(Boolean))
    );
  }, [allProperties]);

  const typeOptions = useMemo(() => {
    return Array.from(
      new Set(allProperties.map((item) => item.type_of_property).filter(Boolean))
    );
  }, [allProperties]);

  const divisionOptions = useMemo(() => {
    return Array.from(
      new Set(allProperties.map((item) => item.division_used).filter(Boolean))
    );
  }, [allProperties]);

  const handleRowClick = (name: string) => {
    setSelectedProperty(name);
    setMode("view")
    setIsSheetOpen(true);
  };

  const handleCreate = () => {
    setSelectedProperty(null);
    setMode("create")
    setIsSheetOpen(true);
  };

  const handleEditClick = (name: string) => {
  setSelectedProperty(name);
  setMode("edit");   
  setIsSheetOpen(true);
};

  const getUrgencyColor = (date?: string) => {
    if (!date) return "text-gray-500";
    const days =
      (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);

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
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
};

  const { data: propertiesCounter } = useDocs<PropertyMaster>({
    doctype: "JH Property Master",
    fields: ["name"],
    limit: 100,
    filters: filters as Filter<PropertyMaster>[],
  });

  const totalPages = Math.ceil(propertiesCounter?.length / propertiesPerPage);

  // access to create/edit property permisssion 
  const roles = createOrEditPermission?.message?.roles || [];
  const canCreateOrEditProperty =
  roles.includes("JH Property Department") ||
  roles.includes("JH Digitrack Admin");
  console.log(roles,"yes")

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between gap-3">
        <SearchBar
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search properties..."
        />

          {
            canCreateOrEditProperty && (
                <Button size="sm" onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Property
                </Button>
            )
          }
      </div>

          <FilterButtons
            filters={[
              {
                label: "Emirates",
                options: emirateOptions,
                selected: selectedEmirate,
                onChange: (value: string) => {
                  setSelectedEmirate((prev) =>
                    prev.includes(value)
                      ? prev.filter((item) => item !== value)
                      : [...prev, value]
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
                onChange: (value: string) => {
                  setSelectedDivision((prev) =>
                    prev.includes(value)
                      ? prev.filter((item) => item !== value)
                      : [...prev, value]
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
              canHaveAccess = {canCreateOrEditProperty}
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
      />
    </div>
  );
}

export default Properties;