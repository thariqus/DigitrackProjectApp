import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOutletContext } from "react-router";

type ContextType = {
  propertyRole: any;
};

export const PropertyTableHeader = ()=> {

  const { propertyRole } = useOutletContext<ContextType>();

  return (
    <TableHeader>
      <TableRow>
        {/* Index */}
        <TableHead className="w-[50px]">#</TableHead>

        <TableHead className="cursor-pointer">
          Property Name
        </TableHead>

        <TableHead className="cursor-pointer">
          Type
        </TableHead>

        <TableHead className="cursor-pointer">
          Division
        </TableHead>

        <TableHead className="cursor-pointer">
         Emirate
        </TableHead>

        <TableHead className="cursor-pointer w-[150px]">
          Current Rent
        </TableHead>

        <TableHead className="cursor-pointer w-[150px]">
          Renewal date
        </TableHead>

        <TableHead className="cursor-pointer">
          Renewal status
        </TableHead>

        {/* Actions */}

        {propertyRole && (
          <TableHead className="w-[100px] text-center">Actions</TableHead>
        )}
      </TableRow>
    </TableHeader>
  );
};

export default PropertyTableHeader;
