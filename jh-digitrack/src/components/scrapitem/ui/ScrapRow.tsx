import { TableCell, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ScrapActions } from "./ScrapActions";
import { useDocs } from "@/hooks/doc";
import { Skeleton } from "@/components/ui/skeleton";
import { JHScrapItem } from "@/types/JHDigitrack/JHScrapItem";

const formatDate = (date?: string) => {
  return date
    ? format(new Date(date), "MMM dd, yyyy")
    : "No Creation Date";
};

export interface ScrapRowProps {
  scrap: JHScrapItem;
  index: number;
  onRowClick: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onView?: (item: JHScrapItem) => void;
  currentPage?: number;
  perPage?: number;
}

export const ScrapRow = ({
  scrap,
  index,
  onRowClick,
  onEdit,
  onDelete,
  onView,
  currentPage = 1,
  perPage = 10,
}: ScrapRowProps) => {
  const formattedDate = formatDate(scrap.date);

  return (
    <TableRow
      key={scrap.name}
    >
      <TableCell>{index + 1 + (currentPage - 1) * perPage}</TableCell>
      <TableCell className="font-medium">{scrap.item_name}</TableCell>
      <TableCell>{scrap.status} </TableCell>
      <TableCell>
        <div>Date: {formattedDate}</div>
        <div>Quantity: {scrap.quantity}</div>
        {scrap.location && <div>Location: {scrap.location}</div>}
        {scrap.contact_details && <div>Contact: {scrap.contact_details}</div>}
        <div>Employee ID: {scrap.employee_id}</div>
        <div>Employee Name: {scrap.employee_name}</div>
      </TableCell>
      <TableCell>{scrap.description}</TableCell>
      <TableCell className="text-right">
      <ScrapActions
        scrap={scrap}
        onEdit={(id) => { onEdit(id); }}
        onDelete={() => {}}
        onView={onView}
        hideDelete={true}
        showRestore={false}
      />


      </TableCell>

    </TableRow>
  );
};

export default ScrapRow;



