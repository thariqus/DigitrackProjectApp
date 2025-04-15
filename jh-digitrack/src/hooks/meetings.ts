import { JHGroupedTaskMaster } from "@/types/JHDigitrack/JHGroupedTaskMaster";
import frappeClient from "@/utils/frappe-client";
import { useMutation, useQuery } from "@tanstack/react-query";

export const useTeamMeetings = (
  reporting_to?: string,
  page: number = 1,
  page_size: number = 10,
  search_query?: string
) => {
  return useQuery({
    queryKey: ["team-meetings", reporting_to, page, page_size, search_query],
    queryFn: () =>
      frappeClient.api.get<{
        message: {
          data: JHGroupedTaskMaster[];
          total: number;
        };
      }>(`jh_digitrack.api.meetings.team_meetings`, {
        reporting_to,
        page,
        page_size,
        search_query,
      }),
    enabled: Boolean(reporting_to),
  });
};

export const useAddMeetingRemark = () => {
  return useMutation({
    mutationFn: (data: {
      meeting_id: string;
      comment: string;
      creator: string;
      type: string;
      remark?: string;
    }) => frappeClient.api.post(`jh_digitrack.api.meetings.add_remark`, data),
  });
};
