import { TableRow, TableCell } from "@/components/ui/table";
import { Pencil } from "lucide-react";
import { useOutletContext } from "react-router";
import StatusBadge from "./StatusBadge";

type ContextType = {
  propertyRole: any;
};

function PropertyTableRow({ property, index, onClick,isLoading,onEdit,renewalColorHighlight,getRenewalStatus,formatDate,canCreateOrEditProperty, }: any) {

   const { propertyRole } = useOutletContext<ContextType>();

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
      <TableCell className="">{index + 1}</TableCell>
      <TableCell>{property.property_name}</TableCell>
      <TableCell>{property.type_of_property}</TableCell>
      <TableCell>{property.division_used} </TableCell>
      <TableCell>{property.emirate}</TableCell>
      <TableCell>{property.current_rent}</TableCell>
      {/* Renewal urgency */}
      <TableCell className={`${renewalColorHighlight(property.renewal_date)} text-center`}>
        {formatDate(property.renewal_date)}
      </TableCell>
      <TableCell className="text-center">
        <div className="flex justify-center">
          <StatusBadge status={getRenewalStatus(property.renewal_date)} />
        </div>
      </TableCell>

      {canCreateOrEditProperty && (
        <TableCell>
        <div
        className="flex justify-center items-center cursor-pointer"
        onClick={(e) => {
          e.stopPropagation(); //  prevent row click
          onEdit(property.name);
        }}
      >
        <Pencil size={13} />
      </div>
      </TableCell>
      )
        
      }
  
    </TableRow>
  );
}

export default PropertyTableRow;