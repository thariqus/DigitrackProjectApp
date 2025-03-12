import { ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { TeamMemberRowProps } from "@/types/tasks";

export const TeamMemberRow = ({
  member,
  isExpanded,
  onToggleExpand,
  onNavigate,
  filteredTasks,
}: TeamMemberRowProps) => {
  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="font-medium">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0 mr-2"
            onClick={onToggleExpand}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          <span className="cursor-pointer hover:underline" onClick={onNavigate}>
            {member.name}
          </span>
        </div>
      </TableCell>
      <TableCell>{member.role}</TableCell>
      <TableCell>{filteredTasks.length}</TableCell>
      <TableCell>
        {member.reportees.length > 0
          ? `${member.reportees.length} members`
          : "None"}
      </TableCell>
    </TableRow>
  );
};

export default TeamMemberRow;
