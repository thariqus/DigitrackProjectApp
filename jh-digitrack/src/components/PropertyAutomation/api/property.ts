import frappe from "@/utils/frappe-client";

const API_BASE = "/api/method/jh_digitrack.api.property_management";

export type RenewalProgressPayload = {
  renewal_id: string;
  cheque_details?: ChequeDetailPayload[];

  po_number?: string;
  miro_number?: string;
  renewed_contract_document?: string;
};

export type ChequeDetailPayload = {
  bank_name?: string;
  cheque_number?: string;
  cheque_amount?: number;
  cheque_date?: string;
  payee?: string;
  signatory?: string;
};

const buildQueryString = (
  params: Record<string, string | number | boolean | undefined>
) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== false) {
      query.set(key, String(value));
    }
  });

  return query.toString();
};

const getApiErrorMessage = (errorData: unknown) => {
  if (errorData && typeof errorData === "object") {
    const payload = errorData as {
      message?: string;
      _server_messages?: string;
      exception?: string;
      exc?: string;
    };

    if (payload.message) {
      return payload.message;
    }

    if (payload._server_messages) {
      try {
        const serverMessages = JSON.parse(payload._server_messages) as string[];
        const firstMessage = serverMessages[0];
        if (firstMessage) {
          try {
            const parsedMessage = JSON.parse(firstMessage) as { message?: string };
            if (parsedMessage.message) {
              return parsedMessage.message;
            }
          } catch {
            return firstMessage;
          }
        }
      } catch {
        return payload._server_messages;
      }
    }

    if (payload.exception) {
      return payload.exception;
    }

    if (payload.exc) {
      return payload.exc;
    }
  }

  return "Failed to save renewal progress";
};

export const propertyApi = {
  getUserAccess: async () => {
    const res = await fetch(`${API_BASE}.get_logged_in_property_user`, {
      credentials: "include",
    });
    const data = await res.json();
    return data.message;
  },

  getPropertyList: async (
    params: Record<string, string | number | boolean | undefined>
  ) => {
    const query = buildQueryString(params);
    const res = await fetch(`${API_BASE}.get_property_list?${query}`, {
      credentials: "include",
    });
    const data = await res.json();
    return data.message as { properties: unknown[]; total: number };
  },

  getPropertyDashboardCounts: async () => {
    const res = await fetch(`${API_BASE}.get_property_dashboard_counts`, {
      credentials: "include",
    });
    const data = await res.json();
    return data.message as {
      total_properties: number;
      active_properties: number;
      renewals_30_days: number;
      renewals_60_days: number;
      renewals_90_days: number;
      overdue: number;
      attention?: {
        overdue_no_renewal: number;
        stalled_renewals: number;
        pending_my_action: number;
        hassantuk_expiring_soon: number;
        cdc_expiring_soon: number;
        po_box_expiring_soon: number;
      };
    };
  },

  getRenewalDoc: async (name: string) => {
    const res = await fetch(
      `${API_BASE}.get_renewal_doc?name=${encodeURIComponent(name)}`,
      { credentials: "include" }
    );
    const data = await res.json();
    return data.message;
  },

  getPendingRenewals: async () => {
    const res = await fetch(`${API_BASE}.get_my_pending_renewals`, {
      credentials: "include",
    });
    const data = await res.json();
    return data.message?.renewals ?? [];
  },

  getPropertyDoc: async (name: string) => {
    const res = await fetch(
      `${API_BASE}.get_property_doc?name=${encodeURIComponent(name)}`,
      { credentials: "include" }
    );
    const data = await res.json();
    return data.message;
  },

  getRenewalList: async (
    params: Record<string, string | number | boolean | undefined>
  ) => {
    const query = buildQueryString(params);
    const res = await fetch(`${API_BASE}.get_renewal_list?${query}`, {
      credentials: "include",
    });
    const data = await res.json();
    return data.message as { renewals: unknown[]; total: number };
  },

  getAllowedActions: async (renewalId: string) => {
    const res = await fetch(
      `${API_BASE}.get_allowed_actions?renewal_id=${encodeURIComponent(renewalId)}`,
      { credentials: "include" }
    );
    const data = await res.json();
    return data.message;
  },

  saveRenewalProgress: async (payload: RenewalProgressPayload) => {
    try {
      return await frappe.api.post(
        "jh_digitrack.api.property_management.save_renewal_progress",
        payload
      );
    } catch (error: unknown) {
      const axiosError = error as {
        response?: {
          data?: unknown;
        };
      };
      const errorData = axiosError.response?.data ?? error;
      throw new Error(getApiErrorMessage(errorData));
    }
  },

  getRenewalAuditTrail: async (renewalId: string) => {
    const res = await fetch(
      `${API_BASE}.get_renewal_audit_trail?renewal_id=${encodeURIComponent(renewalId)}`,
      { credentials: "include" }
    );
    const data = await res.json();
    return data.message?.audit_trail ?? [];
  },

  getRenewalRole: async (renewalId: string) => {
    const res = await fetch(
      `${API_BASE}.get_renewal_role?renewal_id=${encodeURIComponent(renewalId)}`,
      { credentials: "include" }
    );
    const data = await res.json();
    return data.message as
      | {
          role: string;
          on_behalf_of?: string;
          actions?: string[];
          sendback_options?: string[];
        }
      | undefined;
  },

  getRenewalPipelineCounts: async () => {
    const res = await fetch(`${API_BASE}.get_renewal_pipeline_counts`, {
      credentials: "include",
    });
    const data = await res.json();
    return data.message as {
      draft: number;
      pending_approver_1: number;
      pending_approver_2: number;
      pending_approver_3: number;
      pending_cheque_details: number;
      pending_admin_hod: number;
      pending_fc: number;
      pending_cfo: number;
      pending_md: number;
      pending_property_po: number;
      pending_miro: number;
      completed: number;
      withdrawn: number;
    };
  },

    getBankAccounts: async (): Promise<string[]> => {
    const res = await fetch(`${API_BASE}.get_bank_accounts`, {
      credentials: "include",
    });
    const data = await res.json();
    return (data.message as { bank_accounts: string[] }).bank_accounts ?? [];
  },
};