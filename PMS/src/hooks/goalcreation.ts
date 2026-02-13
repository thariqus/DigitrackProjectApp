import { useState, useEffect } from "react";
import { useCurrentUser } from "../hooks/auth";
import frappeClient from "@/utils/frappe-client";

export interface GoalMaster {
  name: string;
  goal_name: string;
  description: string;
  measurement: string;
}

export interface GoalDetail {
  goal_name: string;
  description: string;
  goal_id: string;
  measurement_criteria: string;
  target: string | null;
  uom: string | null;
  weightage: string;
  upward_downward: string;
}

export interface GoalItem {
  goal_id: string;
  description: string;
  measurement_criteria: string;
  target: string;
  uom: string;
}

export interface GoalAssessmentPayload {
  employee_code: string;
  year: string;
  goals: GoalItem[];
}

interface DeleteGoalsPayload {
  parent: string;
  goal_ids: string[];
}

/* ---------------------------------------------------------
   ✅ useGoalMaster (GET)
--------------------------------------------------------- */
export function useGoalMaster(filters?: { created_by_me?: boolean }) {
  const [goals, setGoals] = useState<GoalMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: currentUser } = useCurrentUser();

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const params: any = {};
        if (filters?.created_by_me && currentUser) {
          params.created_by = currentUser;
        }

        const res = await frappeClient.api.get<{
          message: any[];
        }>("jh_digitrack.api.goal_master.get_goals", params);

        const normalized = (res.message || []).map((g: any) => ({
          name: g.name,
          goal_name: g.goal_name,
          description: g.goal_description,
          measurement: g.measurement_criteria,
        }));

        setGoals(normalized);
      } catch (error) {
        console.error("Error fetching goal master:", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) fetchGoals();
  }, [filters?.created_by_me, currentUser]);

  return { goals, loading };
}

/* ---------------------------------------------------------
   ✅ useEmployeeGoals (GET)
--------------------------------------------------------- */
export function useEmployeeGoals(employeeCode: string, year: string) {
  const [employeeGoals, setEmployeeGoals] = useState<GoalDetail[]>([]);
  const [minimumGoals, setMinimumGoals] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [enableGoalSubmission, setEnableGoalSubmission] = useState<boolean>(false);

  useEffect(() => {
    if (!employeeCode || !year) return;

    const fetchEmployeeGoals = async () => {
      try {
        const res = await frappeClient.api.get<{
          message: {
            goals: GoalDetail[];
            minimum_no_of_goals: number;
            enable_goal_submission: number;
          };
        }>("jh_digitrack.api.goal_creation.get_employee_goals", {
          employee_code: employeeCode,
          year,
        });

        setEmployeeGoals(res.message?.goals || []);
        setMinimumGoals(res.message?.minimum_no_of_goals || 0);
        setEnableGoalSubmission(!!res.message?.enable_goal_submission);
      } catch (error) {
        console.error("Error fetching employee goals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeGoals();
  }, [employeeCode, year]);

  return { employeeGoals,minimumGoals,enableGoalSubmission, loading };
}

/* ---------------------------------------------------------
   ✅ useGoalAssessment (POST)
--------------------------------------------------------- */
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
      upward_downward: string;
      weightage: string;
    }[];
  }) => {
    setLoading(true);
    try {
      const res = await frappeClient.api.post(
        "jh_digitrack.api.goal_creation.create_goal_assessment",
        {
          data: payload,
          session_user: currentUser || "Guest",
        }
      );

      return res;
    } catch (error) {
      console.error("Failed to create Goal Assessment:", error);
      return { error: "Failed to create goal assessment." };
    } finally {
      setLoading(false);
    }
  };

  return { createGoalAssessment, loading };
}

/* ---------------------------------------------------------
   ✅ deleteEmployeeGoals (POST)
--------------------------------------------------------- */
export async function deleteEmployeeGoals({
  employee_code,
  year,
  goal_ids,
}: {
  employee_code: string;
  year: string;
  goal_ids: string[];
}) {
  try {
    const res = await frappeClient.api.post(
      "jh_digitrack.api.goal_creation.delete_employee_goals",
      {
        employee_code,
        year,
        goal_ids,
      }
    );

    return res;
  } catch (error) {
    console.error("Error deleting goals:", error);
    return { error: "Failed to delete goals." };
  }
}

/* ---------------------------------------------------------
   ✅ submitGoalAssessment (POST)
--------------------------------------------------------- */
export async function submitGoalAssessment(
  employee_code: string,
  year: string,
  newGoals: any[] = []
) {
  try {
    const res = await frappeClient.api.post(
      "jh_digitrack.api.goal_creation.submit_goal_assessment",
      {
        employee_code,
        year,
        new_goals: newGoals,
      }
    );

    return res;
  } catch (err) {
    console.error("Error submitting Goal Assessment:", err);
    return { error: String(err) };
  }
}


/* ---------------------------------------------------------
   ✅ usePmsYears (GET)
--------------------------------------------------------- */
export const useCopyGoalYears = (enabled = true) => {
  const [copyYears, setCopyYears] = useState<any[]>([]);
  const [copyBaseYear, setCopyBaseYear] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const fetchCopyYears = async () => {
    try {
      setLoading(true);

      const res = await frappeClient.api.get(
        "jh_digitrack.api.pms_report.get_pms_years"
      );

      const message = res?.message;

      // Frappe tuple response → [baseYear, years]
      const baseYear = message?.[0] || "";
      const years = message?.[1] || [];

      setCopyBaseYear(baseYear);
      setCopyYears(years);

      console.log("[useCopyGoalYears] baseYear:", baseYear);
      console.log("[useCopyGoalYears] years:", years);

    } catch (err) {
      console.error("[useCopyGoalYears] Failed to fetch copy years", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      fetchCopyYears();
    }
  }, [enabled]);

  return {
    copyYears,
    copyBaseYear,
    loading,
    fetchCopyYears,
  };
};
