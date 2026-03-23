import frappe from "@/utils/frappe-client";
import { useQuery } from "@tanstack/react-query";
import { useCurrentJhUser } from "@/hooks/auth";

export const useHasPmsAccess = () => {
  const { data: currentJhUser } = useCurrentJhUser();

  return useQuery({
    queryKey: ["pms-access", currentJhUser?.email],
    queryFn: async () => {
      if (!currentJhUser?.email) return { message: { has_access: false } };

      const res = await frappe.api.get<{
        message: { message: { has_access: boolean } };
      }>("jh_digitrack.api.user_details.has_pms_role", {
        email: currentJhUser?.email,
      });

      return { message: res.message.message };
    },
    enabled: !!currentJhUser?.email,
  });
};

export const useHasJrcPermission = () => {
  const { data: currentJhUser } = useCurrentJhUser();

  return useQuery({
    queryKey: ["jrc-permission", currentJhUser?.email],
    queryFn: async () => {
      if (!currentJhUser?.email) return { message: { has_access: false } };

      const res = await frappe.api.get<{
        message: { message: { has_access: boolean } };
      }>("jh_digitrack.api.user_details.has_jrc_permission", {
        email: currentJhUser?.email,
      });

      return { message: res.message.message };
    },
    enabled: !!currentJhUser?.email,
  });
};


export const  useHasPropertyAccess = () => {
  const { data: currentJhUser } = useCurrentJhUser();

  return useQuery({
    queryKey: ["property-access", currentJhUser?.email],
    queryFn: async () => {
      if (!currentJhUser?.email) return { message: { has_access: false } };

      const res = await frappe.api.get<{
        message: { message: { has_access: boolean } };
      }>("jh_digitrack.api.user_details.", {
        email: currentJhUser?.email,
      });

      return { message: res.message.message };
    },
    enabled: !!currentJhUser?.email,
  });
};