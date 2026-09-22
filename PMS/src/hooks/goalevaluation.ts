import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "../hooks/auth";
import { useState, useEffect } from "react";
import frappeClient from "@/utils/frappe-client";
 
export interface GoalAssessment {
  docname: string;
  employee_name: string;
  employee_code: string;
  designation_name?: string;
  grade?: string;
  status: string;
  total_score?: number;
  rating?: number;
  comment?: string;
  eligible_for_increment?: number;
  training_requirement_identified?: number;
  eligible_for_promotion?: number;
  manager_email?: string;
  manager_name?: string;
  submitted_on?: string;
  attachments?: GoalDocumentAttachment[];
  functional_manager_rating?: number;
  functional_manager_comment?: string;
  skip_level_manager_rating?: number;
  skip_level_manager_comment?: string;
  reviewer_role?: "functional" | "skip_level" | null;
}
 
export interface GoalDocumentAttachment {
  row_name?: string;
  file_name: string;
  file_url: string;
  document_type?: string;
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
function useEvaluationList(endpoint: string, queryKeyPrefix: string, selectedYear?: string) {
  const [baseYear, setBaseYear] = useState<string>("");
  const { data: currentUser } = useCurrentUser();
 
  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: [queryKeyPrefix, currentUser, selectedYear],
    queryFn: async () => {
      if (!currentUser) {
        return { assessment_year: "", from_date: "", to_date: "", enable_yearly_appraisal: false, evaluations: [] };
      }
 
      const url = endpoint;
 
      const params: any = {
        user: currentUser,
      };
 
      if (selectedYear) params.year = selectedYear;
 
      const res = await frappeClient.api.get(url, params);
 
      return {
        assessment_year: res.message?.assessment_year?.toString() || "",
        from_date: res.message?.from_date || "",
        to_date: res.message?.to_date || "",
        enable_yearly_appraisal: !!res.message?.enable_yearly_appraisal,
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
    fromDate: data?.from_date,
    toDate: data?.to_date,
    enableYearlyAppraisal: data?.enable_yearly_appraisal || false,
    refetch,
  };
}
 
export function useGoalEvaluation(selectedYear?: string) {
  return useEvaluationList(
    "jh_digitrack.api.goal_evaluation.get_goal_evaluation",
    "goal-evaluation",
    selectedYear
  );
}
 
export function useYearlySubmission(selectedYear?: string) {
  return useEvaluationList(
    "jh_digitrack.api.goal_evaluation.get_yearly_submission",
    "yearly-submission",
    selectedYear
  );
}

export function useFunctionalOrSkipLevelYearlySubmission(selectedYear?: string) {
  return useEvaluationList(
    "jh_digitrack.api.goal_evaluation.get_functional_or_skiplevel_yearly_submission",
    "functional-or-skiplevel-yearly-submission",
    selectedYear
  );
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
  const [attachments, setAttachments] = useState<{ file_name: string; file_url: string }[]>([]);
  const [comment, setComment] = useState("");
  const [enableGoalEvaluation, setEnableGoalEvaluation] = useState(false);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    if (!employeeCode || !year) return;
 
    const getGoals = async () => {
      try {
        const res = await frappeClient.api.get<{
          message: {
            goals: GoalDetail[];
            attachments: { file_name: string; file_url: string }[];
            comment: string;
            enable_goal_evaluation: boolean;
          };
        }>(
          "jh_digitrack.api.goal_evaluation.get_employee_goals",
          { employee_code: employeeCode, year }
        );
 
        setEmployeeGoals(res.message?.goals || []);
        setAttachments(res.message?.attachments || []);
        setComment(res.message?.comment || "");
        setEnableGoalEvaluation(!!res.message?.enable_goal_evaluation);
      } catch (error) {
        console.error("Error fetching employee goals:", error);
      } finally {
        setLoading(false);
      }
    };
 
    getGoals();
  }, [employeeCode, year]);
 
  return { employeeGoals, attachments, comment, enableGoalEvaluation, loading };
}
 
/* ─────────────────────────────────────────────── */
/*              Submit Goal Evaluation             */
/* ─────────────────────────────────────────────── */
/**
 * Advances a Goal Assessment's status. The backend derives which stage is
 * being submitted (reporting manager / functional manager / skip-level
 * manager) from the evaluation's current status, so this single endpoint
 * covers all three review stages. `rating` is required by the backend for
 * the functional/skip-level stages, unused for the reporting-manager stage.
 */
export function useSubmitGoalEvaluation() {
  const [loading, setLoading] = useState(false);

  const submitGoalEvaluation = async (
    employeeCode: string,
    year: string,
    comment: string,
    rating?: number
  ) => {
    try {
      setLoading(true);

      const res = await frappeClient.api.post(
        "jh_digitrack.api.goal_evaluation.submit_goal_evaluation",
        {
          employee_code: employeeCode,
          year,
          comment,
          rating,
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
 
import { useFilesUpload } from "@/hooks/file";
 
export const useUploadGoalAttachment = () => {
  const fileUpload = useFilesUpload();
 
  const uploadGoalAttachment = async (
    employeeCode: string,
    year: string,
    file: File,
    existingAttachments: any   
  ) => {
    let fieldname = null;
 
    if (!existingAttachments.attach1) fieldname = "attach1";
    else if (!existingAttachments.attach2) fieldname = "attach2";
    else if (!existingAttachments.attach3) fieldname = "attach3";
    else return { error: "Maximum 3 attachments reached." };
 
    return new Promise<{ file_url?: string; error?: string }>((resolve) => {
      fileUpload.mutate({
        files: [file],
        employeeCode,
        year,
        doctype: "Goal Assessment",
        docname: `${employeeCode}_${year}`,
        fieldname,                 // <-- IMPORTANT
        isPrivate: 1,
        onProgress: (progress: number) => console.log("Upload Progress:", progress),
        onComplete: (status: boolean) =>
          status
            ? resolve({ file_url: `/private/files/${file.name}` })
            : resolve({ error: "Upload failed" }),
        onError: (error: Error) => resolve({ error: error.message || "Upload error" }),
      });
    });
  };
 
  return { uploadGoalAttachment };
};
 
 
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
 
      console.log("Deleting attachment with params:", {
        employeeCode,
        year,
        fileUrl,
      });
 
      const res = await frappeClient.api.post(
        "jh_digitrack.api.goal_evaluation.delete_goal_attachment",
        {
          employee_code: employeeCode,
          year,
          file_url: fileUrl,
        }
      );
 
      console.log("Delete API response:", res);
 
      return res.message || {};
    } catch (error: any) {
      console.error("Delete API error:", error);
      return { error: error.message };
    } finally {
      setLoading(false);
    }
  };
 
  return { deleteGoalAttachment, loading };
}
 
 