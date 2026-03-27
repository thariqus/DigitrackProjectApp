import { useMemo } from "react";
import { Filter } from "frappe-js-sdk/lib/db/types";
import { PropertyMaster } from "@/types/JHDigitrack/JHPropertyAutomation";

interface UsePropertyFiltersProps {
  searchQuery: string;
  selectedEmirate: string[]
selectedType: string[]
}

export const usePropertyFilters = ({
  searchQuery,
  selectedEmirate,
  selectedType,
}: UsePropertyFiltersProps) => {
    
  const filters = useMemo(() => {
    const result: Filter<PropertyMaster>[] = [];
    if (searchQuery.trim()) {
      result.push(["property_name", "like", `%${searchQuery.trim()}%`]);
    }
    if (selectedEmirate.length) {
  result.push(["emirate", "in", selectedEmirate]);
}

if (selectedType.length) {
  result.push(["type_of_property", "in", selectedType]);
}

    return result;
  }, [searchQuery, selectedEmirate, selectedType]);

  return { filters };
};