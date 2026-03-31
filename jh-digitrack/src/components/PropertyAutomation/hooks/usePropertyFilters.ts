import { useMemo } from "react";
import { Filter } from "frappe-js-sdk/lib/db/types";
import { PropertyMaster } from "@/types/JHDigitrack/JHPropertyAutomation";

interface UsePropertyFiltersProps {
  searchQuery: string;
  selectedEmirate: string[]
  selectedType: string[];
  expiringSoon : boolean;
  selectedDivision: string[];
}

export const usePropertyFilters = ({
  searchQuery,
  selectedEmirate,
  selectedType,
  selectedDivision,
  expiringSoon,
}: UsePropertyFiltersProps) => {

  const filters = useMemo(() => {
    const f: any[] = [];

    // Search
    // if (searchQuery) {
    //   f.push([
    //     "JH Property Master",
    //     "property_name",
    //     "like",
    //     `%${searchQuery}%`,
    //   ]);

    //   f.push([
    //     "JH Property Master",
    //     "landlord",
    //     "like",
    //     `%${searchQuery}%`,
    //   ]);
    // }

    // Multi-select filters
    if (selectedEmirate.length) {
      f.push(["JH Property Master", "emirate", "in", selectedEmirate]);
    }

    if (selectedType.length) {
      f.push(["JH Property Master", "type_of_property", "in", selectedType]);
    }

    if (selectedDivision.length) {
      f.push(["JH Property Master", "division_used", "in", selectedDivision]);
    }

    if (expiringSoon) {
      const today = new Date();
      const future = new Date();
      future.setDate(today.getDate() + 90);

      f.push([
        "JH Property Master",
        "renewal_date",
        "between",
        [
          today.toISOString().split("T")[0],
          future.toISOString().split("T")[0],
        ],
      ]);
    }

    console.log(f,"f")
    return f;
  }, [searchQuery, selectedEmirate, selectedType, selectedDivision, expiringSoon]);

  return { filters };
};