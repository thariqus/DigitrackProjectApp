import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "../hooks/auth";

export interface EmployeeGoal {
  id: string;
  name: string;
  status: string;
}

export function useGoalAssignment() {
  const { data: currentUser } = useCurrentUser(); 
  const queryClient = useQueryClient();

  const {
    data,
    isLoading: loading,
    refetch,
  } = useQuery<{
    assignment_year: string;
    employees: EmployeeGoal[];
  }>({
    queryKey: ["goal-assignment", currentUser],
    queryFn: async () => {
      if (!currentUser) {
        return {
          assignment_year: new Date().getFullYear().toString(),
          employees: [],
        };
      }

      const res = await fetch(
        `/api/method/jh_digitrack.api.goal_assignment.get_employees_with_status?user=${currentUser}`
      );
      const json = await res.json();

      return {
        assignment_year:
          json.message?.assignment_year?.toString() ||
          new Date().getFullYear().toString(),
        employees: json.message?.employees || [],
      };
    },
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 5,
  });

  const employees = data?.employees || [];
  const defaultYear =
    data?.assignment_year || new Date().getFullYear().toString();

  const updateEmployeeStatus = async (emp: EmployeeGoal) => {
    try {
      const res = await fetch(
        "/api/method/jh_digitrack.api.goal_assignment.update_status",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Frappe-CSRF-Token": (window as any).csrf_token || "",
          },
          body: JSON.stringify({
            employee_id: emp.id,
            status: emp.status,
            updated_by: currentUser || "Guest",
          }),
        }
      );
      const data = await res.json();

      if (data.message?.employee) {
        queryClient.setQueryData<{
          assignment_year: string;
          employees: EmployeeGoal[];
        }>(["goal-assignment", currentUser], (old) => {
          if (!old) return old;
          return {
            ...old,
            employees:
              old.employees?.map((e) =>
                e.id === emp.id ? { ...e, status: emp.status } : e
              ) || [],
          };
        });
      }
    } catch (err) {
      console.error("❌ Error updating employee status:", err);
    }
  };

  return {
    employees,
    loading,
    defaultYear,
    refetch,
    updateEmployeeStatus,
  };
}
