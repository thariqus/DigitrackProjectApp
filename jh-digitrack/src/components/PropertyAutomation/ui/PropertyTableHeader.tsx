import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const PropertyTableHeader = ()=> {

  return (
    <TableHeader>
      <TableRow>
        {/* Index */}
        <TableHead className="w-[50px]">#</TableHead>

        <TableHead className="cursor-pointer">
          Property Name
        </TableHead>

        <TableHead className="cursor-pointer">
          Type Of Property
        </TableHead>

        <TableHead className="cursor-pointer">
         Location
        </TableHead>

         <TableHead className="cursor-pointer">
         Emirate
        </TableHead>

         <TableHead className="cursor-pointer">
         Division used
        </TableHead>

        <TableHead className="cursor-pointer w-[150px]">
          Current Rent
        </TableHead>
        <TableHead className="cursor-pointer w-[150px]">
          Rent renewal date
        </TableHead>

        {/* Actions */}
        <TableHead className="w-[100px] text-center">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
};

export default PropertyTableHeader;
