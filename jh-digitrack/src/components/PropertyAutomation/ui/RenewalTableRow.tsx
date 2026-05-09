import { TableRow, TableCell } from "@/components/ui/table";
import { Pencil } from "lucide-react";
import { useOutletContext } from "react-router";
import StatusBadge from "./StatusBadge";


function RenewalTableRow({ renewals , index, onClick,isLoading,onEdit,renewalColorHighlight,formatDate,isLicensingTeam  }: any) {


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
        {Array.from({ length: 8 }).map((_, i) => (
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
      <TableCell>{renewals.property}</TableCell>
      <TableCell>{renewals.division}</TableCell>
      <TableCell>{renewals.current_rent} </TableCell>
      <TableCell>{renewals.proposed_rent}</TableCell>
      <TableCell>{renewals.rent_change_percent != null ? `${Number(renewals.rent_change_percent).toFixed(2)}%` : "-"}</TableCell>
      <TableCell>{renewalPeriod}</TableCell>
      <TableCell><StatusBadge status={renewals.workflow_state} /></TableCell>
      <TableCell>{renewals.modified}</TableCell>

      {isLicensingTeam  && 
        <TableCell>
          
             <div
                className="flex justify-center items-center cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation(); //  prevent row click
                  onEdit(renewals.name);
                }}
                title="Edit Renewal"
              >
                <Pencil size={13} />
            </div>
       
      </TableCell>
}
      
  
    </TableRow>
  );
}

export default RenewalTableRow;