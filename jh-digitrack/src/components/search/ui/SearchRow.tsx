import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { SearchRowProps } from "@/types/search";
import SearchTableHeader from "./SearchTableHeader";
import { format } from "date-fns";
import { Calendar, ClipboardCheck, ListTodo } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

export const SearchRow = ({ result, index, onRowClick }: SearchRowProps) => {
  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => onRowClick(result.id, result.type)}
      key={result.id}
    >
      <TableCell>{index + 1}</TableCell>
      <TableCell colSpan={4} className="p-0 border-t-0">
        <div className="px-2 py-4">
          <div className="flex items-center gap-2 my-2">
            {result.type === "audits" ? (
              <ClipboardCheck className="h-4 w-4" />
            ) : (
              <Calendar className="h-4 w-4" />
            )}
            <h3 className="text-sm font-medium ">{result.name}</h3>
          </div>
          {result?.tasks && result?.tasks?.length > 0 ? (
            <div className="rounded-md border border-[#E2E8F0] bg-white overflow-hidden">
              <Table className="pointer-events-none">
                <SearchTableHeader />
                <TableBody>
                  {result.tasks?.map((result, i) => (
                    <SearchTaskRow
                      key={result.id}
                      result={result}
                      index={i}
                      onRowClick={() => {}}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
};

export const SearchTaskRow = ({
  result,
  index,
  onRowClick,
}: SearchRowProps) => {
  const formatCreatedDate = (createdDate: string) => {
    return format(new Date(createdDate), "MMM dd, yyyy");
  };
  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => onRowClick(result.id, result.type)}
      key={result.id}
    >
      <TableCell>{index + 1}</TableCell>
      <TableCell className="font-medium flex items-center gap-2 mt-2">
        <ListTodo className="h-4 w-4" />
        {result.name}
      </TableCell>

      <TableCell>{result.created_by}</TableCell>

      <TableCell>{formatCreatedDate(result.created_date)}</TableCell>

      <TableCell>
        <StatusBadge status={result.status} />
      </TableCell>
    </TableRow>
  );
};
