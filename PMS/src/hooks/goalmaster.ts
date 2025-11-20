import { useState, useEffect } from "react";
import { useCurrentUser } from "../hooks/auth"; 

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

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/method/jh_digitrack.api.goal_master.get_goals?created_by=${currentUser}`);
      const data = await res.json();
      setGoals(
        (data.message || []).map((g: any, index: number) => ({
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
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const refetch = () => fetchGoals(); 
  const addGoal = async (goal: Partial<GoalMaster>) => {
    try {
      const res = await fetch("/api/method/jh_digitrack.api.goal_master.add_goal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": (window as any).csrf_token || ""
        },
        body: JSON.stringify({
          goal_name: goal.name,
          goal_description: goal.description,
          measurement_criteria: goal.measurement,
          target: goal.target || "",
          created_by: currentUser || "Guest",
        }),
      });

      const data = await res.json();

      if (res.ok && data.message?.goal) {
        setGoals((prev) => [
          {
            id: data.message.goal.name,
            name: data.message.goal.goal_name,
            description: data.message.goal.goal_description,
            measurement: data.message.goal.measurement_criteria,
            target: data.message.goal.target,
          },
          ...prev,
        ]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const editGoal = async (goal: GoalMaster) => {
    try {
      const res = await fetch("/api/method/jh_digitrack.api.goal_master.edit_goal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": (window as any).csrf_token || ""
        },
        body: JSON.stringify({
          name: goal.id,
          goal_name: goal.name,
          goal_description: goal.description,
          measurement_criteria: goal.measurement,
          target: goal.target || "",
          modified_by: currentUser || "Guest",
        }),
      });

      const data = await res.json();

      if (res.ok && data.message?.goal) {
        setGoals((prev) =>
          prev.map((g) => (g.id === goal.id ? goal : g))
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  return { goals, setGoals, loading, addGoal, editGoal, refetch };
}





