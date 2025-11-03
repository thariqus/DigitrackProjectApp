import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "../hooks/auth";
import { useState, useEffect } from "react";

export interface GoalAssessment {
  docname: string;
  employee_name: string;
  employee_code: string;
  status: string;
}
export interface GoalDetail {
  goal_name: string;
  description: string;
  goal_id: string;
  measurement_criteria: string;
  target: string | null;
  uom: string | null;
  achievement_score: string;
  remark: string;
}

export function useGoalEvaluation(selectedYear?: string) {
  const [baseYear, setBaseYear] = useState<string>("");
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading: loading,
    refetch,
  } = useQuery<{
    assessment_year: string;
    evaluations: GoalAssessment[];
  }>({
    queryKey: ["goal-evaluation", currentUser, selectedYear],
    queryFn: async () => {
      if (!currentUser) {
        return {
          assessment_year: "",
          evaluations: [],
        };
      }

      const url = selectedYear
        ? `/api/method/jh_digitrack.api.goal_evaluation.get_goal_evaluation?user=${currentUser}&year=${selectedYear}`
        : `/api/method/jh_digitrack.api.goal_evaluation.get_goal_evaluation?user=${currentUser}`;

      const res = await fetch(url);
      const json = await res.json();

      return {
        assessment_year: json.message?.assessment_year?.toString() || "",
        evaluations: json.message?.evaluations || [],
      };
    },
    enabled: !!currentUser,
  });

  useEffect(() => {
    if (!baseYear && data?.assessment_year) {
      setBaseYear(data.assessment_year);
    }
  }, [data?.assessment_year, baseYear]);

  const years = baseYear
    ? [
        baseYear,
        (parseInt(baseYear, 10) - 1).toString(),
        (parseInt(baseYear, 10) - 2).toString(),
      ]
    : [];

  const evaluations = data?.evaluations || [];
  const defaultYear = data?.assessment_year || "";

  return {
    evaluations,
    loading,
    defaultYear,
    baseYear,
    years,
    refetch,
  };
}
export function useGoalAssessment() {
  const [loading, setLoading] = useState(false);
  const { data: currentUser } = useCurrentUser(); 

  const createGoalAssessment = async (payload: {
    employee_code: string;
    year: string;
    goals: {
      goal_name: string;
      description: string;
      measurement_criteria: string;
      target: string;
      uom: string;
      achievement_score: string;
      remarks: string;
    }[];
  }) => {
    setLoading(true);
    try {

      const response = await fetch(
        "/api/method/jh_digitrack.api.goal_evaluation.create_goal_evaluation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Frappe-CSRF-Token": (window as any).csrf_token || "",
          },
          body: JSON.stringify({
            data: payload, 
            session_user: currentUser || "Guest", 
          }),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(" Error creating Goal Assessment:", error);
      return { error: "Failed to create goal assessment." };
    } finally {
      setLoading(false);
    }
  };

  return { createGoalAssessment, loading };
}
export function useEmployeeGoals(employeeCode: string, year: string) {
  const [employeeGoals, setEmployeeGoals] = useState<GoalDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeCode || !year) return;

    const fetchEmployeeGoals = async () => {
      try {
        const res = await fetch(
          `/api/method/jh_digitrack.api.goal_evaluation.get_employee_goals?employee_code=${employeeCode}&year=${year}`
        );
        const data = await res.json();
        setEmployeeGoals(data.message || []);
      } catch (error) {
        console.error(" Error fetching employee goals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeGoals();
  }, [employeeCode, year]);

  return { employeeGoals, loading };
}

export function useSubmitGoalEvaluation() {
  const [loading, setLoading] = useState(false);

  const submitGoalEvaluation = async (employeeCode: string, year: string) => {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/method/jh_digitrack.api.goal_evaluation.submit_goal_evaluation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employee_code: employeeCode,
            year: year,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || data.exc) {
        throw new Error(data._server_messages || "Failed to submit goal evaluation");
      }

      return data.message || {};
    } catch (error: any) {
      console.error(" Error submitting goal evaluation:", error);
      return { error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return { submitGoalEvaluation, loading };
}