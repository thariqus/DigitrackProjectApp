import frappe from "@/utils/frappe-client";

const API_BASE = "jh_digitrack.api.delegation";

const getApiErrorMessage = (error: unknown) => {
  if (error && typeof error === "object") {
    const payload = error as {
      message?: string;
      _server_messages?: string;
      exception?: string;
      exc?: string;
    };

    if (payload.message) return payload.message;

    if (payload._server_messages) {
      try {
        const msgs = JSON.parse(payload._server_messages);
        return msgs[0] || payload._server_messages;
      } catch {
        return payload._server_messages;
      }
    }

    if (payload.exception) return payload.exception;
    if (payload.exc) return payload.exc;
  }

  return "Delegation API error";
};

export const delegationApi = {
  listDelegations: async () => {
    const res = await frappe.api.get(`${API_BASE}.list_delegations`);
    return res.message?.delegations ?? [];
  },

  createDelegation: async (payload: {
    delegate: string;
    delegation_type: string;
    from_date?: string;
    to_date?: string;
    reference_doctype?: string;
    reference_name?: string;
    comment?: string;
  }) => {
    try {
      return await frappe.api.post(
        `${API_BASE}.create_delegation`,
        payload
      );
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  revokeDelegation: async (name: string) => {
    try {
      return await frappe.api.post(`${API_BASE}.revoke_delegation`, { name });
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  getDocumentDelegation: async (reference_doctype: string, reference_name: string) => {
    try {
      const res = await frappe.api.get(`${API_BASE}.get_document_delegation`, {
        reference_doctype,
        reference_name,
      });
      return res.message?.delegation ?? null;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },
};
