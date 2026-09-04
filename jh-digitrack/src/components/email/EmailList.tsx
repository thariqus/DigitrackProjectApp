import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getEmailList,
  resendEmail,
  type EmailLogRow,
  type EmailLogStatus,
} from "@/hooks/email_log";

const STATUS_FILTERS: Array<{ label: string; value: EmailLogStatus | "All" }> = [
  { label: "All", value: "All" },
  { label: "Sent", value: "Sent" },
  { label: "Pending", value: "Pending" },
  { label: "Failed", value: "Failed" },
];

const STATUS_BADGE_CLASS: Record<EmailLogStatus, string> = {
  Sent: "border-transparent bg-[#0ca30c]/10 text-[#0ca30c]",
  Pending: "border-transparent bg-[#fab219]/15 text-[#a5720a]",
  Failed: "border-transparent bg-[#d03b3b]/10 text-[#d03b3b]",
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return format(new Date(value), "dd MMM yyyy, hh:mm a");
}

export function EmailList() {
  const [rows, setRows] = useState<EmailLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EmailLogStatus | "All">("All");
  const [resendingName, setResendingName] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getEmailList({ limit: 50, status: filter === "All" ? undefined : filter })
      .then(setRows)
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleResend = async (row: EmailLogRow) => {
    setResendingName(row.name);
    try {
      const result = await resendEmail(row.name);
      if (result.status === "success") {
        toast.success(result.message || "Email resent.");
        setRows((prev) =>
          prev.map((r) => (r.name === row.name ? { ...r, status: "Sent", can_resend: false } : r))
        );
      } else {
        toast.error(result.message || "Resend failed.");
      }
    } finally {
      setResendingName(null);
    }
  };

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-100/60 p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Email log</h2>
          <p className="text-xs text-muted-foreground">
            Individual emails from the JH Emails log. Failed emails can be resent manually.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f.value
                ? "bg-[#972e26] text-white"
                : "bg-white/70 text-gray-700 hover:bg-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-white/70 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Cc</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">
                  No emails found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="text-xs whitespace-nowrap">{formatDateTime(row.date)}</TableCell>
                  <TableCell className="text-xs">{row.source_document || "—"}</TableCell>
                  <TableCell className="text-xs max-w-[220px] truncate" title={row.to}>
                    {row.to}
                  </TableCell>
                  <TableCell className="text-xs max-w-[220px] truncate" title={row.cc || undefined}>
                    {row.cc || "—"}
                  </TableCell>
                  <TableCell className="text-xs max-w-[260px] truncate" title={row.subject}>
                    {row.subject}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge className={`w-fit ${STATUS_BADGE_CLASS[row.status]}`}>{row.status}</Badge>
                      {row.status === "Sent" && (
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatDateTime(row.sent_at)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {row.can_resend && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={resendingName === row.name}
                        onClick={() => handleResend(row)}
                      >
                        {resendingName === row.name ? "Resending…" : "Resend"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default EmailList;
