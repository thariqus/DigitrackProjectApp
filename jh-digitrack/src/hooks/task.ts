import frappe from "@/utils/frappe-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { TeamMember } from "@/types/teamtasks";
import { toast } from "sonner";

export const useTeamTasks = (reporting_to?: string) => {
  return useQuery({
    queryKey: ["team-tasks", reporting_to],
    queryFn: () =>
      frappe.api.get<{ message: TeamMember }>(
        `jh_digitrack.api.tasks.team_tasks`,
        {
          reporting_to,
        }
      ),
    enabled: Boolean(reporting_to),
  });
};

export const useTaskChangeLog = (task_id?: string) => {
  return useQuery({
    queryKey: ["task-change-logs", task_id],
    queryFn: () =>
      frappe.api.get(`jh_digitrack.api.tasks.get_change_log`, {
        task_id,
      }),
    enabled: Boolean(task_id),
  });
};

export const useAddTaskRemark = () => {
  return useMutation({
    mutationFn: (data: {
      task_id: string;
      comment: string;
      creator: string;
      type: string;
      remark?: string;
    }) => frappe.api.post(`jh_digitrack.api.tasks.add_remark`, data),
  });
};

export const useRemindTask = () => {
  return useMutation({
    mutationFn: (task_id: string) =>
      frappe.api.post(`jh_digitrack.api.tasks.remind`, { task_id }),
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

export const useEscalateTask = () => {
  return useMutation({
    mutationFn: (task_id: string) =>
      frappe.api.post(`jh_digitrack.api.tasks.escalate`, { task_id }),
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
