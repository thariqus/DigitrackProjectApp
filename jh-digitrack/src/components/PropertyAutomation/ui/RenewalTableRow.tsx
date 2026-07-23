import { TableRow, TableCell } from "@/components/ui/table";
import { Pencil, Download } from "lucide-react";
// import { useOutletContext } from "react-router";
import { RentalRenewal } from "@/types/JHDigitrack/JHPropertyAutomation";
import StatusBadge from "./StatusBadge";

const decodeHtml = (str: string) => {
  const el = document.createElement("div");
  el.innerHTML = str;
  return el.innerText;
};


const DOWNLOADABLE_STATES = ["Pending Property PO", "Pending MIRO", "Completed"];

type RenewalTableRowProps = {
  renewals: RentalRenewal;
  index: number;
  onClick: () => void;
  isLoading?: boolean;
  onEdit: (name: string) => void;
  isJHPropertyDepartment?: boolean;
  isGLTeam ?: boolean
  onDownload: (name: string) => void;
};

function RenewalTableRow({ renewals, index, onClick, isLoading, onEdit, isJHPropertyDepartment, isGLTeam, onDownload }: RenewalTableRowProps) {
  const canEdit = !!isJHPropertyDepartment && renewals?.workflow_state === "Draft";
  const canDownload = (isJHPropertyDepartment || isGLTeam) &&  DOWNLOADABLE_STATES.includes(renewals?.workflow_state);
  const showActionsCell = canEdit || canDownload;

   const renewalPeriod = (() => {
  if (!renewals.renewal_to) return "-";

  const today = new Date();
  const expiryDate = new Date(renewals.renewal_from);

  // Remove time portion for accurate day calculation
  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);

  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return `${diffDays} days left`;
  }

  if (diffDays === 0) {
    return "Expires today";
  }

  return `Expired ${Math.abs(diffDays)} days ago`;
})();

  if(isLoading){
    return (
      <TableRow>
        {Array.from({ length: showActionsCell ? 12 : 11 }).map((_, i) => (
          <TableCell key={i}>
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
          </TableCell>
        ))}
      </TableRow>
    );
  }

  return (
    <TableRow className="cursor-pointer" onClick={onClick}>
      <TableCell className="w-[50px]">{index + 1}</TableCell>
      <TableCell>{renewals.name}</TableCell>
      <TableCell>{renewals.property_name || renewals.property}</TableCell>
      <TableCell>{renewals.division ? decodeHtml(renewals.division) : renewals.division}</TableCell>
      <TableCell>{renewals.current_rent} </TableCell>
      <TableCell>{renewals.proposed_rent}</TableCell>
      {/* <TableCell>{renewals.rent_change != null ? renewals.rent_change : Math.round(Number(renewals.proposed_rent || 0) - Number(renewals.current_rent || 0))}</TableCell> */}
      <TableCell>{renewals.rent_change_percent != null ? `${Number(renewals.rent_change_percent).toFixed(2)}%` : "-"}</TableCell>
      <TableCell>{renewalPeriod}</TableCell>
      <TableCell className="text-center">
          <div className="flex justify-center">
            <StatusBadge
              status={renewals.workflow_state}
              approverName={
                renewals.workflow_state === "Pending Approver 1"
                  ? renewals.approver_1_name
                  : renewals.workflow_state === "Pending Approver 2"
                  ? renewals.approver_2_name
                  : renewals.workflow_state === "Pending Approver 3"
                  ? renewals.approver_3_name
                  : renewals.workflow_state === "Pending Approver 4"
                  ? renewals.approver_4_name
                  : renewals.workflow_state === "Pending Approver 5"
                  ? renewals.approver_5_name
                  : renewals.workflow_state === "Pending Approver 6"
                  ? renewals.approver_6_name
                  : undefined
              }
            />
          </div>
      </TableCell>
      <TableCell>
        {renewals.modified ? (() => {
          const d = new Date(renewals.modified);
          const date = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
          const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
          return <span className="flex flex-col text-xs"><span>{date}</span><span className="text-gray-500">{time}</span></span>;
        })() : "-"}
      </TableCell>

        {showActionsCell && (
          <TableCell>
            <div className="flex justify-center items-center gap-1">
              {canEdit && (
                <div
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(renewals.name);
                  }}
                  title="Edit Renewal"
                >
                  <Pencil size={14} />
                </div>
              )}

              {canDownload && (
                <div
                  className="cursor-pointer text-primary hover:text-green-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(renewals.name);
                  }}
                  title="Download PDF"
                >
                  <Download size={17} />
                </div>
              )}
            </div>
          </TableCell>
        )}
    </TableRow>
  );
}

export default RenewalTableRow;
