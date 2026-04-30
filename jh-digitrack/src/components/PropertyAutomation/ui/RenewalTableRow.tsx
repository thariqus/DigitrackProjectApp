import { TableRow, TableCell } from "@/components/ui/table";
import { Pencil } from "lucide-react";
import { useOutletContext } from "react-router";
import StatusBadge from "./StatusBadge";


function RenewalTableRow({ renewals , index, onClick,isLoading,onEdit,renewalColorHighlight,formatDate,isLicensingTeam  }: any) {


   const renewalPeriod = (() => {
        if (!renewals.renewal_from || !renewals.renewal_to) return "";

        const from = new Date(renewals.renewal_from);
        const to = new Date(renewals.renewal_to);

        const diffTime = to.getTime() - from.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return `${diffDays} days`;
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