import { TableHead, TableHeader, TableRow } from "@/components/ui/table";


export const PropertyTableHeader = ({ tableHeadings,canHaveAccess }: { tableHeadings: string[],canHaveAccess ?: boolean })=> {

  return (
    <TableHeader>
      <TableRow>

        {/* Index */}
        <TableHead className="w-[45px]">#</TableHead>

        {
          tableHeadings.map((heading,index) => (
            <TableHead
                key={index}
                className={`cursor-pointer ${heading === "Workflow Stage" ? "w-[180px]" : ""}`}
              >
                {heading}
              </TableHead>
          )  
          )
        }
        {/* Actions */}

        {canHaveAccess  && (
          <TableHead className="w-[60px] text-center">Actions</TableHead>
        )}
      </TableRow>
    </TableHeader>
  );
};

export default PropertyTableHeader;
