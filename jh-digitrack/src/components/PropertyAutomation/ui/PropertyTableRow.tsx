import { TableRow, TableCell } from "@/components/ui/table";

function PropertyTableRow({ property, index, onClick,isLoading }: any) {
  const getUrgencyColor = (date: string) => {
    const days =
      (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);

    if (days < 30) return "text-red-500";
    if (days < 90) return "text-yellow-500";
    return "text-green-500";
  };

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
      <TableCell className="w-[50px]">{index + 1}</TableCell>
      <TableCell>{property.property_name}</TableCell>
      <TableCell>{property.type_of_property}</TableCell>
      <TableCell>{property.location}</TableCell>
      <TableCell>{property.emirate}</TableCell>
      <TableCell>{property.division_used} </TableCell>
      <TableCell>{property.current_rent}</TableCell>

      {/* Renewal urgency */}
      <TableCell className={getUrgencyColor(property.renewal_date)}>
        {property.renewal_date}
      </TableCell>
    </TableRow>
  );
}

export default PropertyTableRow;