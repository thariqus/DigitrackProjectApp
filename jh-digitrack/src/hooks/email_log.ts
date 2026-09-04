export type EmailLogStatus = "Sent" | "Pending" | "Failed";

export interface EmailLogRow {
  name: string;
  to: string;
  cc: string | null;
  subject: string;
  sender: string;
  source_document: string | null;
  date: string | null;
  sent_at: string | null;
  status: EmailLogStatus;
  can_resend: boolean;
}

export interface ResendEmailResult {
  status: "success" | "Failure";
  message: string;
}

export async function getEmailList(params?: {
  limit?: number;
  offset?: number;
  status?: EmailLogStatus;
}): Promise<EmailLogRow[]> {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));
  if (params?.status) query.set("status", params.status);

  const res = await fetch(
    `/api/method/jh_digitrack.api.email_log.get_email_list?${query.toString()}`,
    { credentials: "include" }
  );
  const result = await res.json();
  return result.message || [];
}

export async function resendEmail(rowName: string): Promise<ResendEmailResult> {
  const csrfToken =
    (window as { frappe?: { csrf_token?: string }; csrf_token?: string })?.frappe
      ?.csrf_token ||
    (window as { frappe?: { csrf_token?: string }; csrf_token?: string })?.csrf_token ||
    "";

  const res = await fetch("/api/method/jh_digitrack.api.email_log.resend_email", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : {}),
    },
    body: JSON.stringify({ row_name: rowName }),
  });
  const result = await res.json();
  return result.message || { status: "Failure", message: "Unexpected error." };
}
