export interface EmailStatTile {
  label: string;
  value: string | number;
  delta: string;
  delta_good: boolean;
}

export interface EmailDailySent {
  day: string;
  date: string;
  count: number;
}

export interface EmailStatusBreakdown {
  key: string;
  label: string;
  value: number;
}

export interface EmailDashboardStats {
  has_sent_emails: boolean;
  stat_tiles?: EmailStatTile[];
  daily_sent?: EmailDailySent[];
  status_breakdown?: EmailStatusBreakdown[];
}

export async function getEmailDashboardStats(): Promise<EmailDashboardStats | null> {
  const res = await fetch(
    "/api/method/jh_digitrack.api.email_stats.get_email_dashboard_stats",
    {
      credentials: "include",
    }
  );
  const result = await res.json();
  return result.message || null;
}
