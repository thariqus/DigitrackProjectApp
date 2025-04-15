import { useCallback } from "react";
import { TaskFilter } from "../../ui/FilterButtons";

interface useMeetingFiltersProps {
  searchQuery: string;
  activeFilters: TaskFilter[];
}

export const useMeetingFilters = ({
  searchQuery,
  activeFilters,
}: useMeetingFiltersProps) => {
  const getFilters = useCallback(
    (onlyActiveFilter = false) => {
      const filters: TaskFilter[] = [["deleted_at", "is", "not set"]];

      if (!onlyActiveFilter) {
        filters.push(...activeFilters);

        // Add search filter if search query exists
        if (searchQuery) {
          filters.push(["task_name", "like", `%${searchQuery}%`]);
        }
      }
      return filters;
    },
    [activeFilters, searchQuery]
  );

  return { getFilters };
};
