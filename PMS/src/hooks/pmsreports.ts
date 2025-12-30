import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useCurrentUser } from "../hooks/auth"; 
import frappeClient from "@/utils/frappe-client";

export interface EmployeeSummary {
  employee_code: string;
  employee_name: string;
}

export interface ManagerSummary {
  manager_email: string;
  manager_name: string;
  manager_code: string;
  department?: string;
  employee_count: number;
  employees_under_manager: EmployeeSummary[];

  goals_pending: number;
  goals_pending_employees: EmployeeSummary[];

  goals_started: number;
  goals_started_employees: EmployeeSummary[];

  goals_submitted: number;
  goals_submitted_employees: EmployeeSummary[];

  evaluation_pending: number;
  evaluation_pending_employees: EmployeeSummary[];

  evaluation_started: number;
  evaluation_started_employees: EmployeeSummary[];

  evaluation_submitted: number;
  evaluation_submitted_employees: EmployeeSummary[];
}

export interface GoalAssessmentResponse {
  message: {
    message: ManagerSummary[];
    year: string;
  };
}

export function useGoalAssessment(
  selectedYear?: string,
  reportMode: "team" | "org" | "admin" = "team"
) {
  const [baseYear, setBaseYear] = useState<string>("");
  const { data: currentUser } = useCurrentUser();

  const { data, isLoading, refetch } = useQuery<GoalAssessmentResponse>({
    queryKey: ["goal-assessment-summary", selectedYear, reportMode, currentUser],

    queryFn: async () => {
      if (!currentUser)
        return { message: { message: [], year: "" } };

      const params: any = { manager: currentUser };
      if (selectedYear) params.year = selectedYear;

      let apiMethod = "";

      if (reportMode === "admin") {
        apiMethod =
          "jh_digitrack.api.pms_report.get_goal_assessment_summary_admin";
      } else if (reportMode === "team") {
        apiMethod =
          "jh_digitrack.api.pms_report.get_goal_assessment_summary";
      } else {
        apiMethod =
          "jh_digitrack.api.pms_report.get_goal_assessment_summary_org";
      }

      const res: any = await frappeClient.api.get(apiMethod, params);

      res.message.message = res.message.message?.map((manager: any) => ({
        ...manager,
        department: manager.department || "Unknown",
        employees_under_manager: manager.employees_under_manager || [],
        goals_pending_employees: manager.goals_pending_employees || [],
        goals_started_employees: manager.goals_started_employees || [],
        goals_submitted_employees: manager.goals_submitted_employees || [],
        evaluation_pending_employees: manager.evaluation_pending_employees || [],
        evaluation_started_employees: manager.evaluation_started_employees || [],
        evaluation_submitted_employees: manager.evaluation_submitted_employees || [],
      })) || [];

      return res;
    },

    enabled: !!currentUser,
  });

  const apiYear = data?.message?.year;

  useEffect(() => {
    if (!baseYear && apiYear) setBaseYear(apiYear);
  }, [apiYear, baseYear]);

  const years = baseYear
    ? [
        baseYear,
        (parseInt(baseYear) - 1).toString(),
        (parseInt(baseYear) - 2).toString(),
      ]
    : [];

  const managers = data?.message?.message || [];

  return {
    managers,
    baseYear,
    years,
    loading: isLoading,
    refetch,
  };
}
