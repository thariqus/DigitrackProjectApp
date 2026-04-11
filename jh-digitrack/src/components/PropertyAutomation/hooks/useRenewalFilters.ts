import { useMemo } from "react";
 
interface UseRenewalFiltersProps {
  searchQuery: string;
  selectedWorkflowStage: string[];
  selectedRenewalDateRange: string[];
  selectedDivision: string[];
  currentJhUser: any;
}
 
export const useRenewalFilters = ({
  searchQuery,
  selectedWorkflowStage,
  selectedDivision,
  selectedRenewalDateRange,
  currentJhUser,
}: UseRenewalFiltersProps) => {
  const filters = useMemo(() => {
    const f: any[] = [];
 
    if (searchQuery) {
      f.push(["JH Property Rental Renewal", "property", "like", `%${searchQuery}%`]);
    }
 
    if (selectedWorkflowStage.length) {
      f.push(["JH Property Rental Renewal", "workflow_state", "in", selectedWorkflowStage]);
    }
 
    if (selectedDivision.length) {
      f.push(["JH Property Rental Renewal", "division", "in", selectedDivision]);
    }
 
    if (selectedRenewalDateRange.length) {
      const today = new Date();
 
      if (selectedRenewalDateRange.includes("This Month")) {
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        f.push([
          "JH Property Rental Renewal",
          "renewal_to",
          "between",
          [today.toISOString().split("T")[0], end.toISOString().split("T")[0]],
        ]);
      }
 
      if (selectedRenewalDateRange.includes("Next 3 Months")) {
        const future = new Date();
        future.setDate(today.getDate() + 90);
        f.push([
          "JH Property Rental Renewal",
          "renewal_to",
          "between",
          [today.toISOString().split("T")[0], future.toISOString().split("T")[0]],
        ]);
      }
 
      if (selectedRenewalDateRange.includes("This Year")) {
        const end = new Date(today.getFullYear(), 11, 31);
        f.push([
          "JH Property Rental Renewal",
          "renewal_to",
          "between",
          [today.toISOString().split("T")[0], end.toISOString().split("T")[0]],
        ]);
      }
    }
 
    return f;
  }, [searchQuery, selectedWorkflowStage, selectedDivision, selectedRenewalDateRange, currentJhUser]);
 
  return { filters };
};