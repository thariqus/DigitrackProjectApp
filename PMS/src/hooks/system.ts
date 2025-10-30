import frappeClient from "@/utils/frappe-client";
import { useQuery } from "@tanstack/react-query";

export const useAppVersion = () => {
  return useQuery({
    queryKey: ["app-version"],
    queryFn: () =>
      frappeClient.api.get(`jh_digitrack.api.system.get_app_version`),
    select: (data) => data.message.app_version,
  });
};

export const useMaintenanceMode = () => {
  return useQuery({
    queryKey: ["maintenance-mode"],
    queryFn: () =>
      frappeClient.api.get(`jh_digitrack.api.system.maintenance_mode`),
  });
};
