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
 
    return f;
    
  }, [searchQuery, selectedWorkflowStage, selectedDivision, selectedRenewalDateRange, currentJhUser]);
 
  return { filters };
};