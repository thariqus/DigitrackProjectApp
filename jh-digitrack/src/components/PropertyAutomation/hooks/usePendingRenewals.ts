import { useQuery } from "@tanstack/react-query";

export const usePendingRenewals = (enabled: boolean) => {
  return useQuery({
    queryKey: ["PendingRenewals"],
    queryFn: async () => {
      const res = await fetch(
        "/api/method/jh_digitrack.api.property_management.get_my_pending_renewals",
        { credentials: "include" }
      );
      const data = await res.json();
      return data.message?.renewals ?? [];
    },
    enabled,
  });
};