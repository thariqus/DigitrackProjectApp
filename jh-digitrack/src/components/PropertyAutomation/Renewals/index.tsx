import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router";
import { Table, TableBody, TableFooter } from "@/components/ui/table";
import { PropertyTableHeader } from "../ui/PropertyTableHeader";
import FilterButtons from "../ui/FilterButtons";
import { RentalRenewal } from "@/types/JHDigitrack/JHPropertyAutomation";
import { PaginationControls } from "../ui/PaginationControls";
import RenewalTableRow from "../ui/RenewalTableRow";
import RenewalSheet from "../ui/RenewalSheet";
import {
  usePendingRenewals,
  useRenewalList,
  useUserAccess,
} from "../hooks/useProperty";

const DOWNLOADABLE_STATES = ["Pending Property PO", "Pending MIRO", "Completed"];

function Renewals() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [renewalsPerPage, setRenewalsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");

  const [selectedWorkflowStage, setSelectedWorkflowStage] = useState<string[]>([]);
  const [selectedRenewalDateRange, setSelectedRenewalDateRange] = useState<string[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string[]>([]);
  const [pendingMyAction, setPendingMyAction] = useState(false);
  const [selectedRenewal, setSelectedRenewal] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { data: roleBasedAccess } = useUserAccess();
  const isMD = roleBasedAccess?.is_md;
  const isLicensingTeam = !!roleBasedAccess?.is_licensing;
  const isJHPropertyDepartment = !!roleBasedAccess?.has_property_dept_role;
  const isCfo = roleBasedAccess?.is_cfo;
  const isApprover1 = roleBasedAccess?.is_approver_1;
  const isApprover2 = roleBasedAccess?.is_approver_2;
  const isApprover3 = roleBasedAccess?.is_approver_3;
  const isGLTeam = roleBasedAccess?.has_gl_team_role;

  const attentionFilter = searchParams.get("attention_filter") || undefined;
  const searchParamKey = searchParams.toString();

  useEffect(() => {
    const workflowStates = searchParams.get("workflow_states");
    const pendingAction = searchParams.get("pending_my_action") === "1";

    if (workflowStates) {
      try {
        const parsedStates = JSON.parse(workflowStates);
        if (Array.isArray(parsedStates)) {
          setSelectedWorkflowStage(parsedStates.filter((item) => typeof item === "string"));
        }
      } catch {
        setSelectedWorkflowStage([]);
      }
    } else {
      setSelectedWorkflowStage([]);
    }

    setPendingMyAction(pendingAction);
    setCurrentPage(1);
  }, [searchParamKey]);

  useEffect(() => {
    const openRenewal = location.state?.openRenewal as string | null;
    if (openRenewal && !selectedRenewal) {
      setSelectedRenewal(openRenewal);
      setMode("view");
      setIsSheetOpen(true);
    }
  }, [location.state?.openRenewal, selectedRenewal]);

  const { data: pendingRenewals = [], isLoading: pendingLoading } =
    usePendingRenewals(pendingMyAction);

  const listParams = useMemo(
    () => ({
      workflow_states: isMD
        ? JSON.stringify(["Pending MD"])
        : selectedWorkflowStage.length
        ? JSON.stringify(selectedWorkflowStage)
        : undefined,
      divisions: selectedDivision.length ? JSON.stringify(selectedDivision) : undefined,
      renewal_period: selectedRenewalDateRange.length
  ? selectedRenewalDateRange[0]
  : undefined,
      attention_filter: attentionFilter,
      limit: renewalsPerPage,
      page: currentPage,
    }),
    [
      isMD,
      selectedWorkflowStage,
      selectedDivision,
      selectedRenewalDateRange,
      attentionFilter,
      renewalsPerPage,
      currentPage,
    ]
  );

  const { data: pageResult, isLoading: docsLoading } = useRenewalList(
    listParams,
    !pendingMyAction
  );

  const { data: allResult } = useRenewalList({ limit: 1000, page: 1 }, true);

  const allRenewals: RentalRenewal[] = allResult?.renewals ?? [];

  const tableHeadings = [
    "Renewal ID",
    "Property Name",
    "Division",
    "Current Rent",
    "Proposed Rent",
    // "Rent Increase Amount",
    "Rent Change%",
    "Renewal Period",
    "Workflow Stage",
    "Updated On",
  ];

  const workflowOptions = useMemo(
    () =>
      Array.from(new Set(allRenewals.map((r) => r.workflow_state || "").filter(Boolean))),
    [allRenewals]
  );

  const divisionOptions = useMemo(
    () =>
      Array.from(new Set(allRenewals.map((r) => r.division || "").filter(Boolean))),
    [allRenewals]
  );

  const isLoading = pendingMyAction ? pendingLoading : docsLoading;

  const renewals: RentalRenewal[] = useMemo(() => {
    if (!pendingMyAction) {
      return pageResult?.renewals ?? [];
    }

    let rows = pendingRenewals;

    if (isMD) {
      rows = rows.filter((r) => r.workflow_state === "Pending MD");
    } else if (selectedWorkflowStage.length) {
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

    rows = [...rows].sort(
      (a, b) => new Date(b.modified ?? 0).getTime() - new Date(a.modified ?? 0).getTime()
    );

    const start = (currentPage - 1) * renewalsPerPage;
    return rows.slice(start, start + renewalsPerPage);
  }, [
    pendingMyAction,
    pageResult,
    pendingRenewals,
    isMD,
    selectedWorkflowStage,
    selectedDivision,
    selectedRenewalDateRange,
    currentPage,
    renewalsPerPage,
  ]);

  const totalPages = useMemo(() => {
    if (pendingMyAction) return Math.ceil(pendingRenewals.length / renewalsPerPage);
    return Math.ceil((pageResult?.total ?? 0) / renewalsPerPage);
  }, [pendingMyAction, pendingRenewals.length, pageResult?.total, renewalsPerPage]);

  const showActionsColumn = useMemo(
    () =>
      renewals.some(
        (r) =>
          (isJHPropertyDepartment && r.workflow_state === "Draft") ||
          ((isJHPropertyDepartment || isGLTeam) &&
            DOWNLOADABLE_STATES.includes(r.workflow_state ?? ""))
      ),
    [renewals, isJHPropertyDepartment, isGLTeam]
  );

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

  const handleDownload = (name: string) => {
    window.open(
      `/api/method/frappe.utils.print_format.download_pdf?doctype=JH Property Rental Renewal&name=${encodeURIComponent(name)}&format=Property Template&no_letterhead=1`,
      "_blank"
    );
  };

  const formatDate = (date?: string) => {
    if (!date) return "";
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${d.getFullYear()}`;
  };



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
            const newParams = new URLSearchParams(searchParams);
            newParams.delete("pending_my_action");
            newParams.delete("attention_filter");
            setSearchParams(newParams, { replace: true });
            setCurrentPage(1);
          },
        }}
        onClear={() => {
          setSelectedWorkflowStage([]);
          setSelectedRenewalDateRange([]);
          setSelectedDivision([]);
          setPendingMyAction(false);
          setSearchParams({}, { replace: true });
          setCurrentPage(1);
        }}
      />

      <div className="rounded-md border">
        <Table className="w-full table-fixed">
          <PropertyTableHeader
            tableHeadings={tableHeadings}
            showCheckbox={false}
            canHaveAccess={showActionsColumn}
          />
          <TableBody>
            {renewals.map((item, index) => (
              <RenewalTableRow
                key={item.name}
                renewals={item}
                index={(currentPage - 1) * renewalsPerPage + index}
                isLoading={isLoading}
                onClick={() => handleRowClick(item.name)}
                onEdit={handleEditClick}
                onDownload={handleDownload}
                formatDate={formatDate}
                isGLTeam={isGLTeam}
                isJHPropertyDepartment={isJHPropertyDepartment}
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
        handleDownload={handleDownload}
        workflowColorHighlight={() => "text-black"}
        typeOptions={[]}
        isLicensingTeam={isLicensingTeam}
        isJHPropertyDepartment={isJHPropertyDepartment}
        isCfo={isCfo}
        isApprover1={isApprover1}
        isApprover2={isApprover2}
        isApprover={!!(isApprover1 || isApprover2 || isApprover3)}
        isGMTeam={false}
        isMD={isMD}
        isGLTeam={isGLTeam}
      />
    </div>
  );
}

export default Renewals;
