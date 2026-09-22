import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink,Download, Plus, X } from "lucide-react";
import { Table, TableBody, TableFooter } from "@/components/ui/table";
import { PropertyTableHeader } from "../ui/PropertyTableHeader";
import PropertyTableRow from "../ui/PropertyTableRow";
import PropertySheet from "../ui/PropertySheet";
import FilterButtons from "../ui/FilterButtons";
import {
  PropertyMaster,
  JHPropertyElectricityConnection,
  JHPropertyLandline,
  JHPropertySewerageAccount,
  ChequeDetail,
} from "@/types/JHDigitrack/JHPropertyAutomation";
import { PaginationControls } from "../ui/PaginationControls";
import SearchBar from "../ui/SearchBar";
import { usePropertyList, useUserAccess } from "../hooks/useProperty";
import StartRenewalModal from "../ui/StartRenewalModal";
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
      message?.is_approver_4 ||
      message?.is_approver_5 ||
      message?.is_approver_7 ||
      message?.is_admin ||
      message?.is_cfo ||
      message?.is_md ||
      message?.has_gl_team_role || 
      message?.has_adhoc_delegation || 
      message?.is_admin_hod ||
      message?.is_fc ||
      message?.has_standing_delegation || 
      message?.has_visible_adhoc_renewal
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

    const handleOpenPropertyDivision = () => {
    window.location.href = "/app/jh-property-division";
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

      const mainFieldDefs: { label: string; get: (p: PropertyMaster) => string | number }[] = [
        { label: "Property Name", get: (p) => p.property_name ?? "" },
        { label: "Type", get: (p) => (p.type_of_property === "Other" ? (p.other_property_type || "Other") : (p.type_of_property ?? "")) },
        { label: "Business Used", get: (p) => p.business_used ?? "" },
        { label: "Division Used", get: (p) => p.division_used ?? "" },
        { label: "Co Code", get: (p) => p.co_code ?? "" },
        { label: "Current Rent", get: (p) => p.current_rent ?? "" },
        { label: "Area (Sqft)", get: (p) => p.area_sqftmtr ?? "" },
        { label: "Per Sqft Rate", get: (p) => p.per_sq_ft_rate ?? "" },
        { label: "Ownership", get: (p) => p.ownership ?? "" },
        { label: "Lease Type", get: (p) => p.lease_type ?? "" },
        { label: "Staff Allocated", get: (p) => p.staff_allocated ?? "" },
        { label: "Per Staff Rent", get: (p) => p.per_staff_rent ?? "" },
        { label: "Booked Under", get: (p) => p.booked_under ?? "" },
        { label: "Profit Center", get: (p) => p.profit_center ?? "" },
        { label: "Cost Center", get: (p) => p.cost_center ?? "" },
        { label: "Number of Units", get: (p) => p.number_of_units ?? "" },
        { label: "Number of Premises", get: (p) => p.number_of_premises ?? "" },
        { label: "Premise Number", get: (p) => p.premise_number ?? "" },
        { label: "Property Status", get: (p) => p.property_status ?? "" },
        { label: "Remarks", get: (p) => p.remark ?? "" },
        { label: "Location", get: (p) => p.location ?? "" },
        { label: "Address", get: (p) => p.address ?? "" },
        { label: "Emirate", get: (p) => p.emirate ?? "" },
        { label: "Country", get: (p) => p.country ?? "" },
        { label: "Makani Number", get: (p) => p.makani_number ?? "" },
        { label: "PO Box Number", get: (p) => p.po_box_number ?? "" },
        { label: "PO Box Renewal Date", get: (p) => formatDate(p.po_box_renewal_date) },
        { label: "Landlord", get: (p) => p.landlord ?? "" },
        { label: "Real Estate", get: (p) => p.real_estate ?? "" },
        { label: "Lease Start Date", get: (p) => formatDate(p.lease_start_date) },
        { label: "Tenancy Period", get: (p) => p.tenancy_period ?? "" },
        { label: "Renewal Date", get: (p) => formatDate(p.renewal_date) },
        { label: "Security Deposit Amount", get: (p) => p.landlord_security_deposit ?? "" },
        { label: "Security Deposit Document", get: (p) => p.documents?.find((d) => d.document_type === "Security Deposit")?.attachment ?? "" },
        { label: "Electricity Accounts", get: (p) => p.electricity_accounts ?? "" },
        { label: "Electricity Security Deposit", get: (p) => p.electricity_water_security_deposit ?? "" },
        { label: "Electricity Deposit Document", get: (p) => p.documents?.find((d) => d.document_type === "Electricity Deposit")?.attachment ?? "" },
        { label: "Landline Accounts", get: (p) => p.landline_accounts ?? "" },
        { label: "Internet Connection", get: (p) => p.internet_connection ?? "" },
        { label: "CDC Expiry", get: (p) => formatDate(p.cdc_expiry) },
        { label: "Hassantuk Expiry", get: (p) => formatDate(p.hassantuk_expiry) },
        { label: "CDC Certificate Document", get: (p) => p.cdc_certificate_document ?? "" },
        { label: "Compliance Remarks", get: (p) => p.compliance_remarks ?? "" },
      ];

      type GroupDef = {
        title: string;
        fields: { label: string; get: (item: unknown) => string | number }[];
        getItems: (p: PropertyMaster) => unknown[];
      };

      const groupDefs: GroupDef[] = [
        {
          title: "Approvers",
          fields: [
            { label: "Order", get: (item) => (item as { order: number }).order ?? "" },
            { label: "Approver", get: (item) => (item as { approver: string }).approver ?? "" },
          ],
          getItems: (p) => [...(p.approver ?? [])].sort((a, b) => a.order - b.order),
        },
        {
          title: "Electricity Connections",
          fields: [
            { label: "Premise Number", get: (item) => (item as JHPropertyElectricityConnection).premise_number ?? "" },
            { label: "Meter ID", get: (item) => (item as JHPropertyElectricityConnection).meter_id ?? "" },
            { label: "Account Number", get: (item) => (item as JHPropertyElectricityConnection).account_number ?? "" },
            { label: "Connection Type", get: (item) => (item as JHPropertyElectricityConnection).connection_type ?? "" },
          ],
          getItems: (p) => p.electricity_connections ?? [],
        },
        {
          title: "Landline Connections",
          fields: [
            { label: "Landline Number", get: (item) => (item as JHPropertyLandline).landline_number ?? "" },
            { label: "Provider", get: (item) => (item as JHPropertyLandline).provider ?? "" },
            { label: "Line Type", get: (item) => (item as JHPropertyLandline).line_type ?? "" },
          ],
          getItems: (p) => p.landline_connections ?? [],
        },
        {
          title: "Sewerage Accounts",
          fields: [
            { label: "Account Number", get: (item) => (item as JHPropertySewerageAccount).account_number ?? "" },
            { label: "Location", get: (item) => (item as JHPropertySewerageAccount).location ?? "" },
          ],
          getItems: (p) => p.sewerage_accounts ?? [],
        },
        {
          title: "Security Deposit Cheques",
          fields: [
            { label: "Cheque Type", get: (item) => (item as ChequeDetail).cheque_type ?? "" },
            { label: "Amount", get: (item) => (item as ChequeDetail).cheque_amount ?? "" },
            { label: "Date", get: (item) => formatDate((item as ChequeDetail).cheque_date) },
            { label: "Payee", get: (item) => (item as ChequeDetail).payee ?? "" },
          ],
          getItems: (p) => p.security_deposit_cheques ?? [],
        },
        {
          title: "Documents",
          fields: [
            { label: "Documents", get: (item) => (item as { attachment?: string }).attachment ?? "" },
          ],
          getItems: (p) => (p.documents ?? []).filter(
            (d) => d.document_type !== "Security Deposit" && d.document_type !== "Electricity Deposit"
          ),
        },
      ];

      const totalCols = mainFieldDefs.length + groupDefs.reduce((sum, g) => sum + g.fields.length, 0);
      const groupHeaderRow: (string | number)[] = new Array(totalCols).fill("");
      const fieldHeaderRow: (string | number)[] = new Array(totalCols).fill("");
      const merges: XLSX.Range[] = [];

      mainFieldDefs.forEach((f, i) => {
        groupHeaderRow[i] = f.label;
        merges.push({ s: { r: 0, c: i }, e: { r: 1, c: i } });
      });

      let colOffset = mainFieldDefs.length;
      groupDefs.forEach((g) => {
        groupHeaderRow[colOffset] = g.title;
        if (g.fields.length > 1) {
          merges.push({ s: { r: 0, c: colOffset }, e: { r: 0, c: colOffset + g.fields.length - 1 } });
          g.fields.forEach((f, i) => { fieldHeaderRow[colOffset + i] = f.label; });
        } else {
          merges.push({ s: { r: 0, c: colOffset }, e: { r: 1, c: colOffset } });
        }
        colOffset += g.fields.length;
      });

      const dataRows: (string | number)[][] = [];
      docs.forEach((p) => {
        const itemsPerGroup = groupDefs.map((g) => g.getItems(p));
        const maxRows = Math.max(1, ...itemsPerGroup.map((items) => items.length));
        const blockStart = 2 + dataRows.length;

        for (let r = 0; r < maxRows; r++) {
          const row: (string | number)[] = [];
          if (r === 0) {
            mainFieldDefs.forEach((f) => row.push(f.get(p)));
          } else {
            mainFieldDefs.forEach(() => row.push(""));
          }
          groupDefs.forEach((g, gi) => {
            const item = itemsPerGroup[gi][r];
            if (item) {
              g.fields.forEach((f) => row.push(f.get(item)));
            } else {
              g.fields.forEach(() => row.push(""));
            }
          });
          dataRows.push(row);
        }

        if (maxRows > 1) {
          for (let c = 0; c < mainFieldDefs.length; c++) {
            merges.push({ s: { r: blockStart, c }, e: { r: blockStart + maxRows - 1, c } });
          }
        }
      });

      const ws = XLSX.utils.aoa_to_sheet([groupHeaderRow, fieldHeaderRow, ...dataRows]);
      ws["!merges"] = merges;

      const colWidths = fieldHeaderRow.map((label, c) => {
        let maxLen = Math.max(String(label).length, String(groupHeaderRow[c] ?? "").length);
        dataRows.forEach((row) => {
          const len = String(row[c] ?? "").length;
          if (len > maxLen) maxLen = len;
        });
        return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
      });
      ws["!cols"] = colWidths;
      ws["!rows"] = [{ hpx: 22 }, { hpx: 20 }];

      XLSX.utils.book_append_sheet(wb, ws, "Properties");

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

  const getRenewalStatus = (date?: string, propertyStatus?: string): string => {
  if (propertyStatus === "Vacated" || propertyStatus === "Closed" || propertyStatus === "Withdrawn") return propertyStatus;

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
    roles.includes("JH Property Department");

  return (
    
    <div className="w-full space-y-4">
      <div className="flex justify-between gap-3">
        <SearchBar
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search properties..."
        />

        {canCreateOrEditProperty && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open("/app/jh-property-business", "_blank")}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Manage Business/Division
            </Button>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Property
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-1 items-center justify-between">
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
        />
      )}

            
    </div>
  );
}

export default Properties;