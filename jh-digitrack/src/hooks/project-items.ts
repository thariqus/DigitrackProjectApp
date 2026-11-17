import { useMutation, useQuery } from "@tanstack/react-query";
import frappe from "@/utils/frappe-client";

export const useSoftDeleteProjectItem = () => useMutation({
  mutationKey: ["SoftDeleteProjectItem"],
  mutationFn: (name: string) => frappe.api.post("jh_digitrack.api.project_items.soft_delete_item", { name }),
});

export type SendProjectItemEmail = { item_name: string; recipients: string[]; cc: string[]; bcc: string[]; message: string };
export const useSendProjectItemEmail = () => useMutation({
  mutationKey: ["SendProjectItemEmail"],
  mutationFn: (payload: SendProjectItemEmail) => frappe.api.post("jh_digitrack.api.project_items.send_project_item_email", payload),
});

export const useApproveRcaAndClose = () => useMutation({
  mutationKey: ["ApproveRcaAndClose"],
  mutationFn: (payload: { item_name: string; status: string; approval_comments: string }) =>
    frappe.api.post("jh_digitrack.api.project_items.approve_rca_and_close", payload),
});

export type ProjectItemAuditEntry = {
  item_id: string;
  item_description: string;
  event: "Item created" | "Item edited" | "Item deleted";
  user: string;
  timestamp: string;
  changes: { field: string; from: unknown; to: unknown }[];
};

export const useProjectItemAudit = (projectId?: string) => useQuery({
  queryKey: ["ProjectItemAudit", projectId],
  queryFn: async () => {
    const response = await frappe.api.get<{ message: ProjectItemAuditEntry[] }>(
      "jh_digitrack.api.project_items.get_project_item_audit",
      { project_id: projectId },
    );
    return response.message;
  },
  enabled: Boolean(projectId),
});
