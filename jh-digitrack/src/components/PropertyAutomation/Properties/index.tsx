import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Plus, X } from "lucide-react";
import { Table, TableBody, TableFooter } from "@/components/ui/table";
import { PropertyTableHeader } from "../ui/PropertyTableHeader";
import PropertyTableRow from "../ui/PropertyTableRow";
import PropertySheet from "../ui/PropertySheet";
import FilterButtons from "../ui/FilterButtons";
import { PropertyMaster } from "@/types/JHDigitrack/JHPropertyAutomation";
import { PaginationControls } from "../ui/PaginationControls";
import SearchBar from "../ui/SearchBar";
import { usePropertyList, useUserAccess } from "../hooks/useProperty";
import StartRenewalModal from "../ui/StartRenewalModal";
import { queryClient } from "@/utils/query-client";
import { propertyApi } from "../api/property";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const tableHeadings = [
  "Property Name",
  "Type",
  "Division",
  "Emirate",
  "Current Rent",
  "Renewal Date",
  "Property Status",
];

function Properties() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [propertiesPerPage, setPropertiesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
  const [selectedEmirate, setSelectedEmirate] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string[]>([]);
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { data: permissionData } = useUserAccess();
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [selectedRenewalProperty, setSelectedRenewalProperty] =
  useState<PropertyMaster | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);

  const renewalFilter = searchParams.get("renewal_filter") || undefined;
  const attentionFilter = searchParams.get("attention_filter") || undefined;

  
  const listParams = useMemo(
    () => ({
      search: searchQuery || undefined,
      emirate: selectedEmirate.length > 0 ? selectedEmirate : undefined,
      type_of_property: selectedType.length > 0 ? selectedType : undefined,
      division: selectedDivision.length > 0 ? selectedDivision : undefined,
      business: selectedBusiness.length > 0 ? selectedBusiness : undefined,
      expiring_soon: expiringSoon || undefined,
      renewal_filter: renewalFilter,
      attention_filter: attentionFilter,
      limit: propertiesPerPage,
      page: currentPage,
    }),
    [
      searchQuery,
      selectedEmirate,
      selectedType,
      selectedDivision,
      selectedBusiness,
      expiringSoon,
      renewalFilter,
      attentionFilter,
      propertiesPerPage,
      currentPage,
    ]
  );

  // view permission of renewal history
    const message = permissionData;
    const role = message?.roles || [];

    const hasPermisssionToViewRenewalHistory = !!(
      role.includes("JH Property Department") ||
      message?.is_licensing ||
      message?.is_approver_1 ||
      message?.is_approver_2 ||
      message?.is_approver_3 ||
      message?.is_cfo ||
      message?.is_md ||
      message?.has_gl_team_role  
    );

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

  const businessOptions = useMemo(
    () => Array.from(new Set(allProperties.map((p) => p.business_used).filter(Boolean))) as string[],
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

  const handleStartRenewal = (property: PropertyMaster) => {
    setSelectedRenewalProperty(property);
    setIsRenewalModalOpen(true);
  };

  const handleSelectRow = (name: string, checked: boolean) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (checked) next.add(name);
      else next.delete(name);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedRows(new Set(properties.map((p) => p.name)));
    else setSelectedRows(new Set());
  };

  const handleDownload = async () => {
    if (selectedRows.size === 0) return;
    setIsDownloading(true);
    try {
      const selectedNames = Array.from(selectedRows);
      const results = await Promise.all(selectedNames.map((name) => propertyApi.getPropertyDoc(name)));
      const docs = results.map((r) => r.doc as PropertyMaster);

      const wb = XLSX.utils.book_new();

      // Sheet 1: Main property details
      const mainRows = docs.map((p) => ({
        "Property Name": p.property_name ?? "",
        "Type": p.type_of_property ?? "",
        "Business Used": p.business_used ?? "",
        "Division Used": p.division_used ?? "",
        "Booked Under": p.booked_under ?? "",
        "Profit Center": p.profit_center ?? "",
        "Number of Units": p.number_of_units ?? "",
        "Number of Premises": p.number_of_premises ?? "",
        "Premise Number": p.premise_number ?? "",
        "Staff Allocated": p.staff_allocated ?? "",
        "Location": p.location ?? "",
        "Emirate": p.emirate ?? "",
        "Country": p.country ?? "",
        "Makani Number": p.makani_number ?? "",
        "PO Box Number": p.po_box_number ?? "",
        "PO Box Renewal Date": formatDate(p.po_box_renewal_date),
        "Landlord": p.landlord ?? "",
        "Real Estate": p.real_estate ?? "",
        "Lease Start Date": formatDate(p.lease_start_date),
        "Tenancy Period": p.tenancy_period ?? "",
        "Renewal Date": formatDate(p.renewal_date),
        "Current Rent": p.current_rent ?? "",
        // "Property Status": getRenewalStatus(p.renewal_date),
        "Security Deposit Amount": p.landlord_security_deposit ?? "",
        "Electricity Accounts": p.electricity_accounts ?? "",
        "Electricity/Water Security Deposit": p.electricity_water_security_deposit ?? "",
        "Landline Accounts": p.landline_accounts ?? "",
        "Internet Connection": p.internet_connection ?? "",
        "CDC Expiry": formatDate(p.cdc_expiry),
        "Hassantuk Expiry": formatDate(p.hassantuk_expiry),
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mainRows), "Properties");

      // Sheet 2: Electricity Connections
      const elecRows = docs.flatMap((p) =>
        (p.electricity_connections ?? []).map((conn) => ({
          "Property Name": p.property_name,
          "Connection Number": conn.connection_number ?? "",
          "Meter ID": conn.meter_id ?? "",
          "Account Number": conn.account_number ?? "",
          "Connection Type": conn.connection_type ?? "",
        }))
      );
      if (elecRows.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(elecRows), "Electricity Connections");
      }

      // Sheet 3: Landline Connections
      const landlineRows = docs.flatMap((p) =>
        (p.landline_connections ?? []).map((conn) => ({
          "Property Name": p.property_name,
          "Landline Number": conn.landline_number ?? "",
          "Provider": conn.provider ?? "",
          "Line Type": conn.line_type ?? "",
        }))
      );
      if (landlineRows.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(landlineRows), "Landline Connections");
      }

      // Sheet 4: Security Deposit Cheques
      const chequeRows = docs.flatMap((p) =>
        (p.security_deposit_cheques ?? []).map((c) => ({
          "Property Name": p.property_name,
          "Cheque Type": c.cheque_type ?? "",
          "Amount": c.cheque_amount ?? "",
          "Date": formatDate(c.cheque_date),
          "Payee": c.payee ?? "",
        }))
      );
      if (chequeRows.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(chequeRows), "Cheque Details");
      }

      // Sheet 5: Approvers
      const approverRows = docs.flatMap((p) =>
        [...(p.approvers ?? [])].sort((a, b) => a.order - b.order).map((a) => ({
          "Property Name": p.property_name,
          "Order": a.order,
          "Approver": a.approver,
        }))
      );
      if (approverRows.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(approverRows), "Approvers");
      }

      XLSX.writeFile(wb, `properties_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (error) {
      console.error("Download failed", error);
      toast.error("Failed to download properties");
    } finally {
      setIsDownloading(false);
    }
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const renewalDate = new Date(date);
  renewalDate.setHours(0, 0, 0, 0);

  const days = Math.floor(
    (renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

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

  const canStartRenewal = 
    roles.includes("JH Licensing Team") || roles.includes("JH Property Department");

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

      <div className="flex items-center justify-between">
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
          {
            label: "Business",
            options: businessOptions,
            selected: selectedBusiness,
            onChange: (value: string) => {
              setSelectedBusiness((prev) =>
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
            if (!expiringSoon) {
              const newParams = new URLSearchParams(searchParams);
              newParams.delete("renewal_filter");
              newParams.delete("attention_filter");
              setSearchParams(newParams, { replace: true });
            }
            setCurrentPage(1);
          },
        }}
        extraActive={!!renewalFilter || !!attentionFilter}
        onClear={() => {
          setSelectedEmirate([]);
          setSelectedType([]);
          setSelectedDivision([]);
          setSelectedBusiness([]);
          setExpiringSoon(false);
          setCurrentPage(1);
          const newParams = new URLSearchParams(searchParams);
          newParams.delete("renewal_filter");
          newParams.delete("attention_filter");
          setSearchParams(newParams, { replace: true });
        }}
      />

         {selectedRows.size > 0 && (
        <div className="flex items-center gap-1">
          <Button size="sm" className="bg-red-300 hover:bg-red-400 text-gray-500" onClick={handleDownload} disabled={isDownloading}>
            <Download className="h-4 w-4" />
            {isDownloading ? "Downloading..." : "Download"}
          </Button>
        </div>
      )}
      </div>

      {renewalFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtered by:</span>
          <Badge variant="secondary" className="gap-1">
            Renewal {renewalFilter === "overdue" ? "Overdue" : `≤ ${renewalFilter} Days`}
            <button
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete("renewal_filter");
                setSearchParams(newParams, { replace: true });
              }}
              className="ml-1 rounded-full hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}

      {attentionFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtered by:</span>
          <Badge variant="secondary" className="gap-1">
            {attentionFilter === "overdue_no_renewal"
              ? "Overdue with no renewal"
              : attentionFilter === "hassantuk_expiring_soon"
              ? "Hassantuk expiring soon"
              : attentionFilter === "cdc_expiring_soon"
              ? "CDC expiring soon"
              : attentionFilter === "po_box_expiring_soon"
              ? "PO Box renewal soon"
              : "Requires attention"}
            <button
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete("attention_filter");
                setSearchParams(newParams, { replace: true });
              }}
              className="ml-1 rounded-full hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}


      <div className="rounded-md border">
        <Table className="w-full table-fixed">
          <PropertyTableHeader
            tableHeadings={tableHeadings}
            canHaveAccess={canCreateOrEditProperty}
            canStartRenewal={canStartRenewal}
            allSelected={properties.length > 0 && properties.every((p) => selectedRows.has(p.name))}
            onSelectAll={handleSelectAll}
          />

          <TableBody>
            {properties.map((item, index) => (
              <PropertyTableRow
                key={item.name}
                property={item}
                index={(currentPage - 1) * propertiesPerPage + index}
                isLoading={isLoading}
                onClick={() => handleRowClick(item.name)}
                onEdit={handleEditClick}
                renewalColorHighlight={getUrgencyColor}
                getRenewalStatus={getRenewalStatus}
                formatDate={formatDate}
                canCreateOrEditProperty={canCreateOrEditProperty}
                canStartRenewal={canStartRenewal}
                onStartRenewal={handleStartRenewal}
                isSelected={selectedRows.has(item.name)}
                onSelect={handleSelectRow}
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
        hasPermisssionToViewRenewalHistory={hasPermisssionToViewRenewalHistory}
      />

      {isRenewalModalOpen && selectedRenewalProperty && (
        <StartRenewalModal
          open={isRenewalModalOpen}
          onOpenChange={setIsRenewalModalOpen}
          propertyId={selectedRenewalProperty.name}
          propertyName={selectedRenewalProperty.property_name}
          currentRent={selectedRenewalProperty.current_rent}
          renewalFrom={selectedRenewalProperty.renewal_date}
          tenancyPeriod={selectedRenewalProperty.tenancy_period}
          mode="new"
          onCreated={() => {
            queryClient.invalidateQueries({
              queryKey: ["RenewalList"],
            });

            queryClient.invalidateQueries({
              queryKey: ["PropertyList"],
            });
          }}
        />
      )}

            
    </div>
  );
}

export default Properties;