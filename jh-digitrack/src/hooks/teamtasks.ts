import frappe from "@/utils/frappe-client";
import { useQuery } from "@tanstack/react-query";
import { TeamMember } from "@/types/teamtasks";

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
