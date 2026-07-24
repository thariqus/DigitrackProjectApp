import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

type PropertyTableHeaderProps = {
  tableHeadings: string[];
  canHaveAccess?: boolean;
  canStartRenewal?: boolean;
  showCheckbox?: boolean;
  allSelected?: boolean;
  onSelectAll?: (checked: boolean) => void;
};

export const PropertyTableHeader = ({
  tableHeadings,
  canHaveAccess,
  canStartRenewal,
  showCheckbox = true,
  allSelected = false,
  onSelectAll,
}: PropertyTableHeaderProps) => {
  return (
    <TableHeader>
      <TableRow>
        {/* Select all checkbox */}
        {showCheckbox && (
          <TableHead className="w-[40px]">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => onSelectAll?.(e.target.checked)}
              aria-label="Select all"
              className="h-4 w-4 cursor-pointer accent-[#972e26]"
            />
          </TableHead>
        )}

        {/* Index */}
        <TableHead className="w-[43px]">#</TableHead>

        {tableHeadings.map((heading, index) => (
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
        ))}

        {/* Actions */}
        {(canHaveAccess || canStartRenewal) && (
          <TableHead className="w-[58px] text-center">Actions</TableHead>
        )}
      </TableRow>
    </TableHeader>
  );
};

export default PropertyTableHeader;
