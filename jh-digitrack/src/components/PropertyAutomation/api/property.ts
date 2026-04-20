const API_BASE = "/api/method/jh_digitrack.api.property_management";

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
    return data.message as { properties: any[]; total: number };
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
    return data.message as { renewals: any[]; total: number };
  },

  getAllowedActions: async (renewalId: string) => {
    const res = await fetch(
      `${API_BASE}.get_allowed_actions?renewal_id=${encodeURIComponent(renewalId)}`,
      { credentials: "include" }
    );
    const data = await res.json();
    return data.message;
  },
};