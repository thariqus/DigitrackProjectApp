import { JHAudits } from "@/types/JHDigitrack/JHAudits";
import frappeClient from "@/utils/frappe-client";
import { useQuery } from "@tanstack/react-query";

export const useTeamAudits = (
  reporting_to?: string,
  page: number = 1,
  page_size: number = 10,
  search_query?: string
) => {
  return useQuery({
    queryKey: ["team-audits", reporting_to, page, page_size, search_query],
    queryFn: () =>
      frappeClient.api.get<{
        message: {
          data: JHAudits[];
          total: number;
        };
      }>(`jh_digitrack.api.audits.team_audits`, {
        reporting_to,
        page,
        page_size,
        search_query,
      }),
    enabled: Boolean(reporting_to),
  });
};
