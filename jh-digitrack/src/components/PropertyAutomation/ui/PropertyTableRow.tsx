import { TableRow, TableCell } from "@/components/ui/table";
import { Pencil } from "lucide-react";
import StatusBadge from "./StatusBadge";
import RenewalIcon from "../../../../public/icon2.png"

function PropertyTableRow({ property, index, onClick,isLoading,onEdit,renewalColorHighlight,getRenewalStatus,formatDate,canCreateOrEditProperty, canStartRenewal,onStartRenewal,isSelected,onSelect}: any) {

const isRenewalInProgress = !!property.has_active_renewal;
const isPropertyInactive = property.property_status === "Vacated" || property.property_status === "Closed";

  if(isLoading){
    return (
      <TableRow>
        {Array.from({ length: 9 }).map((_, i) => (
          <TableCell key={i}>
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
          </TableCell>
        ))}
      </TableRow>
    );
  }

  return (
    <TableRow className="cursor-pointer" onClick={onClick}>
      <TableCell>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(property.name, e.target.checked);
          }}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select row"
          className="h-4 w-4 cursor-pointer accent-[#972e26]"
        />
      </TableCell>
      <TableCell className="">{index + 1}</TableCell>
      <TableCell>{property.property_name}</TableCell>
      <TableCell>{property.type_of_property}</TableCell>
      <TableCell>{property.division_used} </TableCell>
      <TableCell >{property.emirate}</TableCell>
      <TableCell className="text-center">{property.current_rent}</TableCell>
      {/* Renewal urgency */}
      <TableCell className={`${renewalColorHighlight(property.renewal_date)} text-center`}>
        {formatDate(property.renewal_date)}
      </TableCell>
      <TableCell className="text-center">
        <div className="flex justify-center">
          <StatusBadge status={getRenewalStatus(property.renewal_date, property.latest_renewal_workflow_state === "Withdrawn" ? "Withdrawn" : property.property_status)} />
        </div>
      </TableCell>


      {(canCreateOrEditProperty || canStartRenewal) && (
        <TableCell className="flex pt-5 justify-center items-center gap-1">
          {canCreateOrEditProperty && (
            <div
              className="flex justify-center items-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(property.name);
              }}
            >
              <Pencil size={14} />
            </div>
          )}

          {canStartRenewal && !isRenewalInProgress && !isPropertyInactive && (
            <div
              title="Initiate Renewal"
              onClick={(e) => {
                e.stopPropagation();
                onStartRenewal(property);
              }}
            >
              <img src={RenewalIcon} alt="Renewal icon" className="w-[30px] h-6"/>
            </div>
          )}
        </TableCell>
      )}
  
    </TableRow>
  );
}

export default PropertyTableRow;