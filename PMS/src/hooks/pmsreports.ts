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

  goals_started: number;
  goals_started_employees: EmployeeSummary[];

  goals_submitted: number;
  goals_submitted_employees: EmployeeSummary[];

  rpt_manager_started: number;
  rpt_manager_started_employees: EmployeeSummary[];

  rpt_manager_submitted: number;
  rpt_manager_submitted_employees: EmployeeSummary[];

  fm_manager_started: number;
  fm_manager_started_employees: EmployeeSummary[];

  fm_manager_submitted: number;
  fm_manager_submitted_employees: EmployeeSummary[];

  sm_manager_started: number;
  sm_manager_started_employees: EmployeeSummary[];

  sm_manager_submitted: number;
  sm_manager_submitted_employees: EmployeeSummary[];

  evaluation_started: number;
  evaluation_started_employees: EmployeeSummary[];

  evaluation_submitted: number;
  evaluation_submitted_employees: EmployeeSummary[];
}

export interface PMSYear {
  year: string;
  quaterly?: string;
  from_date?: string;
  to_date?: string;
  is_current?: boolean;
}

export interface GoalAssessmentResponse {
  message: {
    message: ManagerSummary[];
    current_year: string;
    current_quarterly?: string;
    years: PMSYear[];
  };
}


export function useGoalAssessment(
  selectedYear?: string,
  reportMode: "team" | "org",
  selectedQuarterly?: string
) {
  const [baseYear, setBaseYear] = useState<string>("");
  const [baseQuarterly, setBaseQuarterly] = useState<string>("");
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
          goals_started_employees: manager.goals_started_employees || [],
          goals_submitted_employees: manager.goals_submitted_employees || [],
          rpt_manager_started: manager.rpt_manager_started || 0,
          rpt_manager_started_employees:
            manager.rpt_manager_started_employees || [],

          rpt_manager_submitted: manager.rpt_manager_submitted || 0,
          rpt_manager_submitted_employees:
            manager.rpt_manager_submitted_employees || [],

          fm_manager_started: manager.fm_manager_started || 0,
          fm_manager_started_employees:
            manager.fm_manager_started_employees || [],

          fm_manager_submitted: manager.fm_manager_submitted || 0,
          fm_manager_submitted_employees:
            manager.fm_manager_submitted_employees || [],

          sm_manager_started: manager.sm_manager_started || 0,
          sm_manager_started_employees:
            manager.sm_manager_started_employees || [],

          sm_manager_submitted: manager.sm_manager_submitted || 0,
          sm_manager_submitted_employees:
            manager.sm_manager_submitted_employees || [],
          evaluation_started: manager.evaluation_started || 0,  
          evaluation_started_employees:
            manager.evaluation_started_employees || [],
          evaluation_submitted: manager.evaluation_submitted || 0,  
          evaluation_submitted_employees:
            manager.evaluation_submitted_employees || [],
        })) || [];

      return res;
    },

    enabled: !!currentUser,
  });

  const currentYear = data?.message?.current_year;
  const currentQuarterly = data?.message?.current_quarterly;

  useEffect(() => {
    if (!baseYear && currentYear) {
      setBaseYear(currentYear);
    }
  }, [currentYear, baseYear]);

  useEffect(() => {
    if (!baseQuarterly && currentQuarterly) {
      setBaseQuarterly(currentQuarterly);
    }
  }, [currentQuarterly, baseQuarterly]);

  const periods = data?.message?.years || [];

  const selectedPeriod =
    periods.find((p) => p.quaterly === (selectedQuarterly || baseQuarterly)) ||
    periods.find((p) => p.year === (selectedYear || baseYear));

  const fromDate = selectedPeriod?.from_date;
  const toDate = selectedPeriod?.to_date;

  return {
    managers: data?.message?.message || [],
    baseYear,
    baseQuarterly,
    periods,
    fromDate,
    toDate,
    loading: isLoading,
    refetch,
  };


}


export function useGoalAssessmentAdmin(
  selectedYear?: string,
  selectedQuarterly?: string
) {
  const [baseYear, setBaseYear] = useState<string>("");
  const [baseQuarterly, setBaseQuarterly] = useState<string>("");

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
          goals_started_employees: manager.goals_started_employees || [],
          goals_submitted_employees: manager.goals_submitted_employees || [],
          rpt_manager_started: manager.rpt_manager_started || 0,
          rpt_manager_started_employees:
            manager.rpt_manager_started_employees || [],

          rpt_manager_submitted: manager.rpt_manager_submitted || 0,
          rpt_manager_submitted_employees:
            manager.rpt_manager_submitted_employees || [],

          fm_manager_started: manager.fm_manager_started || 0,
          fm_manager_started_employees:
            manager.fm_manager_started_employees || [],

          fm_manager_submitted: manager.fm_manager_submitted || 0,
          fm_manager_submitted_employees:
            manager.fm_manager_submitted_employees || [],

          sm_manager_started: manager.sm_manager_started || 0,
          sm_manager_started_employees:
            manager.sm_manager_started_employees || [],

          sm_manager_submitted: manager.sm_manager_submitted || 0,
          sm_manager_submitted_employees:
            manager.sm_manager_submitted_employees || [],   
          evaluation_started: manager.evaluation_started || 0,         
          evaluation_started_employees:
            manager.evaluation_started_employees || [],
          evaluation_submitted: manager.evaluation_submitted || 0,  
          evaluation_submitted_employees:
            manager.evaluation_submitted_employees || [],
        })) || [];

      return res;
    },
  });

  const currentYear = data?.message?.current_year;
  const currentQuarterly = data?.message?.current_quarterly;

  useEffect(() => {
    if (!baseYear && currentYear) {
      setBaseYear(currentYear);
    }
  }, [currentYear, baseYear]);

  useEffect(() => {
    if (!baseQuarterly && currentQuarterly) {
      setBaseQuarterly(currentQuarterly);
    }
  }, [currentQuarterly, baseQuarterly]);

  const periods = data?.message?.years || [];

  const selectedPeriod =
    periods.find((p) => p.quaterly === (selectedQuarterly || baseQuarterly)) ||
    periods.find((p) => p.year === (selectedYear || baseYear));

  const fromDate = selectedPeriod?.from_date;
  const toDate = selectedPeriod?.to_date;

  return {
    managers: data?.message?.message || [],
    baseYear,
    baseQuarterly,
    periods,
    fromDate,
    toDate,
    loading: isLoading,
    refetch,
  };

}
