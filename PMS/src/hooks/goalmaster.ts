
import { useState, useEffect } from "react";
import { useCurrentUser } from "../hooks/auth";
import frappeClient from "@/utils/frappe-client";

export interface GoalMaster {
  id: string;
  name: string;
  description: string;
  measurement: string;
  target?: string;
  created_by?: string;
  modified_by?: string;
  goal_assigned?: boolean;
}

export function useGoalMaster() {
  const [goals, setGoals] = useState<GoalMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: currentUser } = useCurrentUser();

  // -------------------------------
  // Fetch Goals
  // -------------------------------
  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await frappeClient.api.get<{
        message: any[];
      }>("jh_digitrack.api.goal_master.get_goals", {
        created_by: currentUser,
      });

      setGoals(
        (res.message || []).map((g: any, index: number) => ({
          id: g.name || `GM${index + 1}`,
          name: g.goal_name || "",
          description: g.goal_description || "",
          measurement: g.measurement_criteria || "",
          target: g.target || "",
          created_by: g.created_by || "",
          modified_by: g.modified_by || "",
          goal_assigned: g.goal_assigned || false,
        }))
      );
    } catch (error) {
      console.error(" Error fetching goals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    fetchGoals();
  }, [currentUser]);

  const refetch = () => fetchGoals();


  // -------------------------------
  // Add Goal
  // -------------------------------
  const addGoal = async (goal: Partial<GoalMaster>) => {
    try {
      const res = await frappeClient.api.post<{
        message: {
          success: boolean;
          error?: string;
          goal?: any;
        };
      }>("jh_digitrack.api.goal_master.add_goal", {
        goal_name: goal.name,
        goal_description: goal.description,
        measurement_criteria: goal.measurement,
        target: goal.target || "",
        created_by: currentUser || "Guest",
      });
      if (res.message?.success === false) {
        throw new Error(res.message.error || "Failed to add goal.");
      }
      if (res.message?.goal) {
        const g = res.message.goal;

        setGoals((prev) => [
          {
            id: g.name,
            name: g.goal_name,
            description: g.goal_description,
            measurement: g.measurement_criteria,
            target: g.target,
          },
          ...prev,
        ]);
      }
    } catch (error: any) {
  console.error(" Error adding goal:", error);

  const cleanError = new Error(
    error?.message ||
    error?.error ||
    error?.response?.data?.message ||
    "Failed to add goal."
  );

  throw cleanError;
}

  };


  // -------------------------------
  // Edit Goal
  // -------------------------------
  const editGoal = async (goal: GoalMaster) => {
    try {
      const res = await frappeClient.api.post<{
        message: { goal: any };
      }>("jh_digitrack.api.goal_master.edit_goal", {
        name: goal.id,
        goal_name: goal.name,
        goal_description: goal.description,
        measurement_criteria: goal.measurement,
        target: goal.target || "",
        modified_by: currentUser || "Guest",
      });

      if (res.message?.goal) {
        setGoals((prev) =>
          prev.map((g) => (g.id === goal.id ? goal : g))
        );
      }
    } catch (error) {
      console.error(" Error editing goal:", error);
    }
  };

  return { goals, setGoals, loading, addGoal, editGoal, refetch };
}


