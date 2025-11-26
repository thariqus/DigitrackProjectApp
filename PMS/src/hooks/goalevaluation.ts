import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "../hooks/auth";
import { useState, useEffect } from "react";
import frappeClient from "@/utils/frappe-client";

export interface GoalAssessment {
  docname: string;
  employee_name: string;
  employee_code: string;
  status: string;
  total_score?: number;
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
  achieved?: string;
  upwarddownward?: "U" | "D";
  weightage: string | null;
}

/* ─────────────────────────────────────────────── */
/*               Goal Evaluation List               */
/* ─────────────────────────────────────────────── */
export function useGoalEvaluation(selectedYear?: string) {
  const [baseYear, setBaseYear] = useState<string>("");
  const { data: currentUser } = useCurrentUser();

  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ["goal-evaluation", currentUser, selectedYear],
    queryFn: async () => {
      if (!currentUser) {
        return { assessment_year: "", evaluations: [] };
      }

      const url = "jh_digitrack.api.goal_evaluation.get_goal_evaluation";

      const params: any = {
        user: currentUser,
      };

      if (selectedYear) params.year = selectedYear;

      const res = await frappeClient.api.get(url, params);

      return {
        assessment_year: res.message?.assessment_year?.toString() || "",
        evaluations: res.message?.evaluations || [],
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
        (parseInt(baseYear) - 1).toString(),
        (parseInt(baseYear) - 2).toString(),
      ]
    : [];

  return {
    evaluations: data?.evaluations || [],
    loading,
    defaultYear: data?.assessment_year || "",
    baseYear,
    years,
    refetch,
  };
}

/* ─────────────────────────────────────────────── */
/*            Create Goal Evaluation (POST)         */
/* ─────────────────────────────────────────────── */
export function useGoalAssessment() {
  const [loading, setLoading] = useState(false);
  const { data: currentUser } = useCurrentUser();

  const createGoalAssessment = async (payload: any) => {
    setLoading(true);

    try {

      const res = await frappeClient.api.post(
        "jh_digitrack.api.goal_evaluation.create_goal_evaluation",
        {
          data: payload,
          session_user: currentUser || "Guest",
        }
      );

      return res;
    } catch (error) {
      console.error("Error creating Goal Assessment:", error);
      return { error: "Failed to create goal assessment." };
    } finally {
      setLoading(false);
    }
  };

  return { createGoalAssessment, loading };
}

/* ─────────────────────────────────────────────── */
/*       Get Employee Goals for Evaluation         */
/* ─────────────────────────────────────────────── */
export function useEmployeeGoals(employeeCode: string, year: string) {
  const [employeeGoals, setEmployeeGoals] = useState<GoalDetail[]>([]);
  const [attachments, setAttachments] = useState<
    { file_name: string; file_url: string }[]
  >([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeCode || !year) return;

    const getGoals = async () => {
      try {
        const res = await frappeClient.api.get(
          "jh_digitrack.api.goal_evaluation.get_employee_goals",
          {
            employee_code: employeeCode,
            year,
          }
        );

        setEmployeeGoals(res.message?.goals || []);
        setAttachments(res.message?.attachments || []);
        setComment(res.message?.comment || "");
      } catch (error) {
        console.error("Error fetching employee goals:", error);
      } finally {
        setLoading(false);
      }
    };

    getGoals();
  }, [employeeCode, year]);

  return { employeeGoals, attachments, comment, loading };
}

/* ─────────────────────────────────────────────── */
/*              Submit Goal Evaluation             */
/* ─────────────────────────────────────────────── */
export function useSubmitGoalEvaluation() {
  const [loading, setLoading] = useState(false);

  const submitGoalEvaluation = async (
    employeeCode: string,
    year: string,
    comment: string
  ) => {
    try {
      setLoading(true);

      const res = await frappeClient.api.post(
        "jh_digitrack.api.goal_evaluation.submit_goal_evaluation",
        {
          employee_code: employeeCode,
          year,
          comment,
        }
      );

      return res.message || {};
    } catch (error: any) {
      return { error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return { submitGoalEvaluation, loading };
}

/* ─────────────────────────────────────────────── */
/*               Upload Goal Attachment            */
/* ─────────────────────────────────────────────── */

export function useUploadGoalAttachment() {
  const [loading, setLoading] = useState(false);

  const uploadGoalAttachment = async (
    employeeCode: string,
    year: string,
    file: File
  ) => {
    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `/api/method/jh_digitrack.api.goal_evaluation.upload_goal_attachment?employee_code=${employeeCode}&year=${year}`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      let data: any = {};

      try {
        data = await res.json();
      } catch {
        throw new Error("Server returned invalid JSON");
      }


      if (!res.ok || data.exc || data.exception) {
        let errorMessage = "Failed to upload file";

        if (data._server_messages) {
          try {
            const serverMsg = JSON.parse(data._server_messages);
            if (Array.isArray(serverMsg) && serverMsg[0]?.message) {
              errorMessage = serverMsg[0].message;
              throw new Error(errorMessage);
            }
          } catch {}
        }

        if (data.exception && errorMessage === "Failed to upload file") {
          const msg = data.exception.split(":", 2)[1]?.trim();
          if (msg) {
            errorMessage = msg;   
          }
        }

        if (data.exc && errorMessage === "Failed to upload file") {
          try {
            const trace = JSON.parse(data.exc);
            const lastLine = trace[0].split("\n").pop();
            const cleaned = lastLine.replace("frappe.exceptions.ValidationError:", "").trim();
            if (cleaned) {
              errorMessage = cleaned;  
            }
          } catch {}
        }

        throw new Error(errorMessage);
      }


      return data.message || {};
    } catch (error: any) {
      console.error("Upload error:", error);
      return { error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return { uploadGoalAttachment, loading };
}

/* ─────────────────────────────────────────────── */
/*               Delete Goal Attachment            */
/* ─────────────────────────────────────────────── */
export function useDeleteGoalAttachment() {
  const [loading, setLoading] = useState(false);

  const deleteGoalAttachment = async (
    employeeCode: string,
    year: string,
    fileUrl: string
  ) => {
    try {
      setLoading(true);

      const res = await frappeClient.api.post(
        "jh_digitrack.api.goal_evaluation.delete_goal_attachment",
        {
          employee_code: employeeCode,
          year,
          file_url: fileUrl,
        }
      );

      return res.message || {};
    } catch (error: any) {
      return { error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return { deleteGoalAttachment, loading };
}
