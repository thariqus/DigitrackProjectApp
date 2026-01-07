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

export interface PMSYear {
  year: string;
  from_date?: string;
  to_date?: string;
}

export interface GoalAssessmentResponse {
  message: {
    message: ManagerSummary[];
    current_year: string;
    years: PMSYear[];
  };
}


export function useGoalAssessment(
  selectedYear?: string,
  reportMode: "team" | "org"
) {
  const [baseYear, setBaseYear] = useState<string>("");
  const { data: currentUser } = useCurrentUser();

  const { data, isLoading, refetch } = useQuery<GoalAssessmentResponse>({
    queryKey: ["goal-assessment-summary", selectedYear, reportMode],

    queryFn: async () => {
      if (!currentUser) {
        return {
          message: {
            message: [],
            current_year: "",
            years: [],
          },
        };
      }

      const params: any = { manager: currentUser };
      if (selectedYear) params.year = selectedYear;

      const apiMethod =
        reportMode === "team"
          ? "jh_digitrack.api.pms_report.get_goal_assessment_summary"
          : "jh_digitrack.api.pms_report.get_goal_assessment_summary_org";

      const res: any = await frappeClient.api.get(apiMethod, params);

      res.message.message =
        res.message.message?.map((manager: any) => ({
          ...manager,
          department: manager.department || "Unknown",
          employees_under_manager: manager.employees_under_manager || [],
          goals_pending_employees: manager.goals_pending_employees || [],
          goals_started_employees: manager.goals_started_employees || [],
          goals_submitted_employees: manager.goals_submitted_employees || [],
          evaluation_pending_employees:
            manager.evaluation_pending_employees || [],
          evaluation_started_employees:
            manager.evaluation_started_employees || [],
          evaluation_submitted_employees:
            manager.evaluation_submitted_employees || [],
        })) || [];

      return res;
    },

    enabled: !!currentUser,
  });

  const currentYear = data?.message?.current_year;

  useEffect(() => {
    if (!baseYear && currentYear) {
      setBaseYear(currentYear);
    }
  }, [currentYear, baseYear]);

  const years =
    data?.message?.years?.map(y => y.year) || [];
  const selectedYearData = data?.message?.years?.find(
    (y) => y.year === (selectedYear || baseYear)
  );

  const fromDate = selectedYearData?.from_date;
  const toDate = selectedYearData?.to_date;

  return {
    managers: data?.message?.message || [],
    baseYear,
    years,
    fromDate,
    toDate,
    loading: isLoading,
    refetch,
  };


}


export function useGoalAssessmentAdmin(selectedYear?: string) {
  const [baseYear, setBaseYear] = useState<string>("");

  const { data, isLoading, refetch } = useQuery<GoalAssessmentResponse>({
    queryKey: ["goal-assessment-summary-admin", selectedYear],

    queryFn: async () => {
      const params: any = {};
      if (selectedYear) params.year = selectedYear;

      const res: any = await frappeClient.api.get(
        "jh_digitrack.api.pms_report.get_goal_assessment_summary_admin",
        params
      );

      res.message.message =
        res.message.message?.map((manager: any) => ({
          ...manager,
          department: manager.department || "Unknown",
          employees_under_manager: manager.employees_under_manager || [],
          goals_pending_employees: manager.goals_pending_employees || [],
          goals_started_employees: manager.goals_started_employees || [],
          goals_submitted_employees: manager.goals_submitted_employees || [],
          evaluation_pending_employees:
            manager.evaluation_pending_employees || [],
          evaluation_started_employees:
            manager.evaluation_started_employees || [],
          evaluation_submitted_employees:
            manager.evaluation_submitted_employees || [],
        })) || [];

      return res;
    },
  });

  const currentYear = data?.message?.current_year;

  useEffect(() => {
    if (!baseYear && currentYear) {
      setBaseYear(currentYear);
    }
  }, [currentYear, baseYear]);

  const years =
    data?.message?.years?.map(y => y.year) || [];
  const selectedYearData = data?.message?.years?.find(
    (y) => y.year === (selectedYear || baseYear)
  );

  const fromDate = selectedYearData?.from_date;
  const toDate = selectedYearData?.to_date;

  return {
    managers: data?.message?.message || [],
    baseYear,
    years,
    fromDate,
    toDate,
    loading: isLoading,
    refetch,
  };

}
