import { useCallback } from "react";
import { TaskFilter } from "../../ui/FilterButtons";

interface UseTaskFiltersProps {
  searchQuery: string;
  activeFilters: TaskFilter[];
  activeFilter?: string;
  currentJHUser: { name: string } | null | undefined;
  currentUser: string | null | undefined;
}

export const useTaskFilters = ({
  searchQuery,
  activeFilters,
  activeFilter,
  currentJHUser,
  currentUser,
}: UseTaskFiltersProps) => {
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

      // Add filter based on activeFilter
      if (activeFilter === "my-tasks" && currentJHUser) {
        filters.push(["assigned_to", "=", currentJHUser.name]);
        if (!filters.some((filter) => filter[0] === "status"))
          filters.push(["status", "in", ["Open", "In Progress"]]);
        if (!filters.some((filter) => filter[0] === "private"))
          filters.push(["private", "=", "0"]);
      } else if (activeFilter === "created-by-me" && currentUser) {
        filters.push(["owner", "=", currentUser]);
        if (!filters.some((filter) => filter[0] === "status"))
          filters.push(["status", "not in", ["Closed", "Cancelled"]]);
      } else if (activeFilter === "deleted-tasks") {
        const deletedFilter = filters.find(
          (filter) => filter[0] === "deleted_at"
        );
        if (deletedFilter) {
          deletedFilter[2] = "set";
          if (currentUser) filters.push(["owner", "=", currentUser]);
        }
      }

      return filters;
    },
    [activeFilter, activeFilters, currentJHUser, currentUser, searchQuery]
  );

  return { getFilters };
};
