import { TableRow, TableCell } from "@/components/ui/table";
import { Pencil, RefreshCw } from "lucide-react";
import { useOutletContext } from "react-router";
import StatusBadge from "./StatusBadge";
import { Button } from "@/components/ui/button";
import StartRenewalModal from "./StartRenewalModal";
import { useRenewalList } from "../hooks/useProperty";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ContextType = {
  propertyRole: any;
};

function PropertyTableRow({ property, index, onClick,isLoading,onEdit,renewalColorHighlight,getRenewalStatus,formatDate,canCreateOrEditProperty, canStartRenewal,onStartRenewal}: any) {

   const { propertyRole } = useOutletContext<ContextType>();
   const { data: renewalsListData } = useRenewalList(
  {
    property: property.name,
    limit: 50,
    page: 1,
  },
  !!property.name
);

const renewalsData = renewalsListData?.renewals ?? [];

const latestRenewal =
  renewalsData.length > 0
    ? [...renewalsData].sort(
        (a, b) =>
          new Date(b.modified).getTime() -
          new Date(a.modified).getTime()
      )[0]
    : null;

const isRenewalInProgress =
  !!latestRenewal &&
  latestRenewal.workflow_state !== "Completed";

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

     
        <TableCell>
        {canCreateOrEditProperty && (
        <div
        className="flex justify-center items-center cursor-pointer"
        onClick={(e) => {
          e.stopPropagation(); //  prevent row click
          onEdit(property.name);
        }}
      >
        <Pencil size={13} />
      </div>
        )}

        {
          canStartRenewal && (
            <div>
             <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    disabled={isRenewalInProgress}
                    className="p-0 bg-[#972e26] hover:bg-[#972e26]/90"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartRenewal(property);
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>

                <TooltipContent>
                  <p>Initiate Renewal</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
                    </div>

                    
                  )
                }


      </TableCell>
  
    </TableRow>
  );
}

export default PropertyTableRow;