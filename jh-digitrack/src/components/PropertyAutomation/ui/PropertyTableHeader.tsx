import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOutletContext } from "react-router";

type ContextType = {
  propertyRole: any;
};

export const PropertyTableHeader = ({ tableHeadings }: { tableHeadings: string[] })=> {

  const { propertyRole } = useOutletContext<ContextType>();

  return (
    <TableHeader>
      <TableRow>

        {/* Index */}
        <TableHead className="w-[50px]">#</TableHead>

        {
          tableHeadings.map((heading,index) => (
              <TableHead key={index} className="cursor-pointer">
              {heading}
            </TableHead>
          )  
          )
        }
        {/* Actions */}

        {propertyRole && (
          <TableHead className="w-[60px] text-center">Actions</TableHead>
        )}
      </TableRow>
    </TableHeader>
  );
};

export default PropertyTableHeader;
