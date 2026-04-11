import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import { Table, TableBody, TableFooter } from "@/components/ui/table";
import { PropertyTableHeader } from "../ui/PropertyTableHeader";
import FilterButtons from "../ui/FilterButtons";
import { useDocs } from "@/hooks/doc";
import { RentalRenewal } from "@/types/JHDigitrack/JHPropertyAutomation";
import { Filter } from "frappe-js-sdk/lib/db/types";
import { PaginationControls } from "../ui/PaginationControls";
import RenewalTableRow from "../ui/RenewalTableRow";
import { useRenewalFilters } from "../hooks/useRenewalFilters";
import { useOutletContext } from "react-router";
import RenewalSheet from "../ui/RenewalSheet";
 
type ContextType = {
  currentJhUser: any;
};
 
function Renewals() {
  const location = useLocation();
  const [searchQuery] = useState("");
  const [renewalsPerPage, setRenewalsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
 
  const [selectedWorkflowStage, setSelectedWorkflowStage] = useState<string[]>([]);
  const [selectedRenewalDateRange, setSelectedRenewalDateRange] = useState<string[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string[]>([]);
  const [pendingMyAction, setPendingMyAction] = useState(false);
  const [roleBasedAccess, setRoleBasedAccess] = useState<any>([]);
  const [selectedRenewal, setSelectedRenewal] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
 
  // Renewals fetched directly from the actor-aware endpoint (bypasses DocType permissions)
  const [pendingRenewals, setPendingRenewals] = useState<RentalRenewal[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
 
  // permission access for particular user
  useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await fetch(
          "/api/method/jh_digitrack.api.property_management.get_logged_in_property_user",
          { credentials: "include" }
        );
        const data = await res.json();
        setRoleBasedAccess(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchRole();
  }, []);
 
  // Auto-open specific renewal from navigation state
  useEffect(() => {
    const openRenewal = location.state?.openRenewal as string | null;
    if (openRenewal && !selectedRenewal) {
      setSelectedRenewal(openRenewal);
      setMode("view");
      setIsSheetOpen(true);
    }
  }, [location.state?.openRenewal, selectedRenewal]);
 
  const { currentJhUser } = useOutletContext<ContextType>();
 
  // When "Pending My Action" is toggled ON, fetch directly from the server-side
  // actor-aware endpoint (ignore_permissions=True on the backend).
  // This is necessary because approvers have no DocType-level read role, so
  // going through useDocs / frappe.db.getDocList would return nothing for them.
  useEffect(() => {
    if (!pendingMyAction) {
      setPendingRenewals([]);
      return;
    }
 
    setPendingLoading(true);
    fetch(
      "/api/method/jh_digitrack.api.property_management.get_my_pending_renewals",
      { credentials: "include" }
    )
      .then((res) => res.json())
      .then((data: any) => {
        setPendingRenewals(data.message?.renewals ?? []);
      })
      .catch((err) => {
        console.error(err);
        setPendingRenewals([]);
      })
      .finally(() => setPendingLoading(false));
  }, [pendingMyAction]);
 
  // Standard filters used by useDocs (only active when pendingMyAction is OFF)
  const { filters } = useRenewalFilters({
    searchQuery,
    selectedWorkflowStage,
    selectedRenewalDateRange,
    selectedDivision,
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
 
  const { data: allFilteredRenewals = [], isLoading: docsLoading } = useDocs<RentalRenewal>({
    doctype: "JH Property Rental Renewal",
    fields: [
      "name", "property", "current_rent", "proposed_rent",
      "rent_change_percent", "renewal_from", "renewal_to",
      "division", "workflow_state", "modified",
    ],
    limit: renewalsPerPage,
    page: currentPage,
    filters: filters as Filter<RentalRenewal>[],
    orderBy: {
      field: "`tabJH Property Rental Renewal`.`modified`",
      order: "asc",
    },
    enabled: !pendingMyAction,
  });
 
  const { data: allRenewals = [] } = useDocs<RentalRenewal>({
    doctype: "JH Property Rental Renewal",
    fields: ["workflow_state", "division"],
    limit: 1000,
  });
 
  const workflowOptions = useMemo(() => {
    return Array.from(
      new Set(allRenewals.map((item) => item.workflow_state || "").filter(Boolean) as string[])
    );
  }, [allRenewals]);
 
  const divisionOptions = useMemo(() => {
    return Array.from(
      new Set(allRenewals.map((item) => item.division || "").filter(Boolean) as string[])
    );
  }, [allRenewals]);
 
  // Decide which data + pagination to show
  const isLoading = pendingMyAction ? pendingLoading : docsLoading;
 
  
  const renewals: RentalRenewal[] = useMemo(() => {
    if (!pendingMyAction) {
      return allFilteredRenewals;
    }
 
    let rows = pendingRenewals;
 
    if (selectedWorkflowStage.length) {
      rows = rows.filter((r) => selectedWorkflowStage.includes(r.workflow_state ?? ""));
    }
    if (selectedDivision.length) {
      rows = rows.filter((r) => selectedDivision.includes(r.division ?? ""));
    }
    if (selectedRenewalDateRange.length) {
      const today = new Date();
      rows = rows.filter((r) => {
        if (!r.renewal_to) return false;
        const renewalTo = new Date(r.renewal_to);
        if (selectedRenewalDateRange.includes("This Month")) {
          const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          if (renewalTo >= today && renewalTo <= end) return true;
        }
        if (selectedRenewalDateRange.includes("Next 3 Months")) {
          const future = new Date();
          future.setDate(today.getDate() + 90);
          if (renewalTo >= today && renewalTo <= future) return true;
        }
        if (selectedRenewalDateRange.includes("This Year")) {
          const end = new Date(today.getFullYear(), 11, 31);
          if (renewalTo >= today && renewalTo <= end) return true;
        }
        return false;
      });
    }
 
    // Client-side pagination for the pending list
    const start = (currentPage - 1) * renewalsPerPage;
    return rows.slice(start, start + renewalsPerPage);
  }, [
    pendingMyAction,
    allFilteredRenewals,
    pendingRenewals,
    selectedWorkflowStage,
    selectedDivision,
    selectedRenewalDateRange,
    currentPage,
    renewalsPerPage,
  ]);
 
  const totalPages = useMemo(() => {
    if (pendingMyAction) {
      return Math.ceil(pendingRenewals.length / renewalsPerPage);
    }
    // useDocs counter query
    return Math.ceil(allFilteredRenewals.length / renewalsPerPage);
  }, [pendingMyAction, pendingRenewals, allFilteredRenewals, renewalsPerPage]);
 
  const handleRowClick = (name: string) => {
    setSelectedRenewal(name);
    setMode("view");
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
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  };
 
  const roles = roleBasedAccess?.message?.roles || [];
  const isLicensingTeam = roles.includes("JH Licensing Team");
  const isJHPropertyDEpartment = roles.includes("JH Property Department");
  const isCfo = roleBasedAccess?.message?.is_cfo;
  const isMD = roleBasedAccess?.message?.is_md;
  const isApprover1 = roleBasedAccess?.message?.is_approver_1;
  const isApprover2 = roleBasedAccess?.message?.is_approver_2;
  const isGLTeam = roleBasedAccess?.message?.has_gl_team_role;
  const roleBasedFilter = renewals.filter(renewal => renewal.Division)

  console.log(roleBasedAccess,"roleaccess")
 
  return (
    <div className="w-full space-y-4">
      <FilterButtons
        filters={[
          {
            label: "Workflow Stage",
            options: workflowOptions,
            selected: selectedWorkflowStage,
            onChange: (value) => {
              setSelectedWorkflowStage((prev) =>
                prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
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
                prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
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
                prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
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
          <PropertyTableHeader tableHeadings={tableHeadings} canHaveAccess={isLicensingTeam} />
 
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
                isLicensingTeam={isLicensingTeam}
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
        workflowColorHighlight={() => "text-black"}
        typeOptions={[]}
        isLicensingTeam={isLicensingTeam}
        isJHPropertyDEpartment={isJHPropertyDEpartment}
        isCfo = {isCfo}
        isApprover1= {isApprover1}
        isApprover2 ={isApprover2}
        isMD = {isMD}
        isGLTeam= {isGLTeam}
      />
    </div>
  );
}
 
export default Renewals;