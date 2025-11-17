import { useState, useEffect } from "react";
import { useCurrentUser } from "../hooks/auth";

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
export function useGoalMaster(filters?: { created_by_me?: boolean }) {
  const [goals, setGoals] = useState<GoalMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: currentUser } = useCurrentUser(); 

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        let query = "/api/method/jh_digitrack.api.goal_master.get_goals";

        if (filters?.created_by_me && currentUser) {
          query += `?created_by=${encodeURIComponent(currentUser)}`;
        }

        const res = await fetch(query);
        const data = await res.json();

        const normalized = (data.message || []).map((g: any) => ({
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


export function useEmployeeGoals(employeeCode: string, year: string) {
  const [employeeGoals, setEmployeeGoals] = useState<GoalDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeCode || !year) return;

    const fetchEmployeeGoals = async () => {
      try {
        const res = await fetch(
          `/api/method/jh_digitrack.api.goal_creation.get_employee_goals?employee_code=${employeeCode}&year=${year}`
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

      const response = await fetch(
        "/api/method/jh_digitrack.api.goal_creation.create_goal_assessment",
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
      return { error: "Failed to create goal assessment." };
    } finally {
      setLoading(false);
    }
  };

  return { createGoalAssessment, loading };
}

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
    const response = await fetch(
      "/api/method/jh_digitrack.api.goal_creation.delete_employee_goals",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": (window as any).csrf_token || "",
        },
        body: JSON.stringify({ employee_code, year, goal_ids }),
      }
    );
    return await response.json();
  } catch (error) {
    console.error(" Error deleting goals:", error);
    return { error: "Failed to delete goals." };
  }
}


export async function submitGoalAssessment(
  employee_code: string,
  year: string,
  newGoals: any[] = []
) {
  try {

    const res = await fetch("/api/method/jh_digitrack.api.goal_creation.submit_goal_assessment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Frappe-CSRF-Token": (window as any).csrf_token || "",
      },
      body: JSON.stringify({
        employee_code: employee_code,
        year: year,
        new_goals: newGoals,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.error(" Error submitting Goal Assessment:", err);
    return { error: String(err) };
  }
}
