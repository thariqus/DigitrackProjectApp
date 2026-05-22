import { TableHead, TableHeader, TableRow } from "@/components/ui/table";


export const PropertyTableHeader = ({ tableHeadings,canHaveAccess }: { tableHeadings: string[],canHaveAccess ?: boolean })=> {

  return (
    <TableHeader>
      <TableRow>

        {/* Index */}
        <TableHead className="w-[43px]">#</TableHead>

        {
          tableHeadings.map((heading,index) => (
            
            <TableHead
                key={index}
                className={`
                  cursor-pointer
                  ${heading === "Workflow Stage" ? "w-[185px] text-center" : ""}
                  ${heading === "Renewal Date" || heading === "Renewal Status" ? "text-center" : ""}
                `}
              >
                {heading}
              </TableHead>
          )  
          )
        }
        {/* Actions */}

        {canHaveAccess  && (
          <TableHead className="w-[58px] text-center">Actions</TableHead>
        )}
      </TableRow>
    </TableHeader>
  );
};

export default PropertyTableHeader;
