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
export function useGoalEvaluation() {
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
    queryKey: ["goal-evaluation", currentUser],
    queryFn: async () => {
      if (!currentUser) {
        return {
          assessment_year: new Date().getFullYear().toString(),
          evaluations: [],
        };
      }

      const res = await fetch(
        `/api/method/jh_digitrack.api.goal_evaluation.get_goal_evaluation?user=${currentUser}`
      );
      const json = await res.json();

      return {
        assessment_year:
          json.message?.assessment_year?.toString() ||
          new Date().getFullYear().toString(),
        evaluations: json.message?.evaluations || [],
      };
    },
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 5,
  });

  const evaluations = data?.evaluations || [];
  const defaultYear =
    data?.assessment_year || new Date().getFullYear().toString();

  const updateEvaluationStatus = async (
    evaluation: GoalAssessment,
    status: string
  ) => {
    try {
      const res = await fetch(
        `/api/method/jh_digitrack.api.goalevaluation.update_status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Frappe-CSRF-Token": (window as any).csrf_token || "",
          },
          body: JSON.stringify({
            employee_code: evaluation.employee_code,
            status,
            updated_by: currentUser,
          }),
        }
      );
      const data = await res.json();

      if (data.message?.updated) {
        queryClient.setQueryData<
          { assessment_year: string; evaluations: GoalAssessment[] }
        >(["goal-evaluation", currentUser], (old) => {
          if (!old) return old;
          return {
            ...old,
            evaluations:
              old.evaluations?.map((e) =>
                e.employee_code === evaluation.employee_code
                  ? { ...e, status }
                  : e
              ) || [],
          };
        });
      }
    } catch (err) {
      console.error(" Error updating evaluation status:", err);
    }
  };

  return {
    evaluations,
    loading,
    defaultYear,
    refetch,
    updateEvaluationStatus,
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