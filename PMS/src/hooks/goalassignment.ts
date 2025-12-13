import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useCurrentUser } from "../hooks/auth";
import frappeClient from "@/utils/frappe-client";

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

      // Build params instead of raw URL
      const params: Record<string, any> = {
        user: currentUser,
      };
      if (selectedYear) params.year = selectedYear;

      // Use frappeClient.api.get (automatic: csrf, cookies, base url, errors)
      const res = await frappeClient.api.get<{
        message: {
          assignment_year: string;
          employees: EmployeeGoal[];
        };
      }>("jh_digitrack.api.goal_assignment.get_employees_with_status", params);

      return {
        assignment_year: res.message?.assignment_year || "",
        employees: res.message?.employees || [],
      };
    },

    enabled: !!currentUser,
  });

  // Set base year once
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
