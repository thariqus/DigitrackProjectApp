import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useCurrentUser } from "../hooks/auth";

export interface EmployeeGoal {
  id: string;
  name: string;
  status: string;
}

export function useGoalAssignment(selectedYear?: string) {
  const [baseYear, setBaseYear] = useState<string>("");
  const { data: currentUser } = useCurrentUser();

  const { data, isLoading: loading, refetch } = useQuery<{
    assignment_year: string;
    employees: EmployeeGoal[];
  }>({
    queryKey: ["goal-assignment", selectedYear, currentUser],
    queryFn: async () => {
      if (!currentUser) {
        return { assignment_year: "", employees: [] };
      }

      const url = selectedYear
        ? `/api/method/jh_digitrack.api.goal_assignment.get_employees_with_status?user=${currentUser}&year=${selectedYear}`
        : `/api/method/jh_digitrack.api.goal_assignment.get_employees_with_status?user=${currentUser}`;

      const res = await fetch(url);
      const json = await res.json();

      return {
        assignment_year: json.message?.assignment_year || "",
        employees: json.message?.employees || [],
      };
    },
    enabled: !!currentUser,
  });

  useEffect(() => {
    if (!baseYear && data?.assignment_year) {
      setBaseYear(data.assignment_year);
    }
  }, [data?.assignment_year, baseYear]);

  const years = baseYear
    ? [
        baseYear,
        (parseInt(baseYear) - 1).toString(),
        (parseInt(baseYear) - 2).toString(),
      ]
    : [];

  const employees = data?.employees || [];

  return {
    employees,
    baseYear,
    years,
    loading,
    refetch,
  };
}
