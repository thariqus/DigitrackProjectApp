import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import DOMPurify from "dompurify";
import { MessageSquare, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentJhUser, useJhUser } from "@/hooks/auth";
import { useAddComment, useDocDetail, useDocTypeMeta } from "@/hooks/doc";
import { queryClient } from "@/utils/query-client";

type Props = { projectId?: string; itemId?: string; createdBy?: string; createdAt?: string; employeeName?: (employee: string) => string };
type Log = { owner: string; creation: string; comment_type: string; content: string; owner_user_id: string };
type ChildRow = [string, { employee?: string }];
type ChildRowChange = [string, number, string, [string, string, string][]];
const versionValue = (fieldtype: string | undefined, value: unknown) => {
  if (fieldtype === "Check" && [0, 1, "0", "1"].includes(value as number | string)) {
    return Number(value) ? "Yes" : "No";
  }
  return String(value ?? "—");
};
// Child table edits are logged as rows added, removed or changed. The Item
// form re-sends every row on save, so only the net difference is a change.
const assignmentChange = (data: { added?: ChildRow[]; removed?: ChildRow[]; row_changed?: ChildRowChange[] }) => {
  const rows = (entries: ChildRow[] = []) => entries.filter((row) => row[0] === "assigned_participants").map((row) => row[1]?.employee).filter(Boolean) as string[];
  const added = new Set(rows(data.added)), removed = new Set(rows(data.removed));
  (data.row_changed ?? []).filter((row) => row[0] === "assigned_participants").forEach((row) => row[3].forEach(([field, from, to]) => {
    if (field === "employee") { removed.add(from); added.add(to); }
  }));
  return { added: [...added].filter((id) => !removed.has(id)), removed: [...removed].filter((id) => !added.has(id)) };
};
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

export default function ProjectTimeline({ projectId, itemId, createdBy, createdAt, employeeName = (employee) => employee }: Props) {
  const doctype = itemId ? "JH Project Item" : "JH Project";
  const documentName = itemId || projectId || "";
  const [comment, setComment] = useState("");
  const { data: currentJhUser } = useCurrentJhUser();
  const addComment = useAddComment();
  const { data: detail, isLoading: loadingDetail } = useDocDetail({ doctype, name: documentName, disabled: !documentName });
  const { data: meta, isLoading: loadingMeta } = useDocTypeMeta(doctype);
  const loading = loadingDetail || loadingMeta;

  const comments: Log[] = (detail?.docinfo?.comments ?? []).map((entry: any) => ({
    owner: entry.owner, owner_user_id: entry.owner, creation: entry.creation,
    comment_type: entry.comment_type || "Comment", content: entry.content || "",
  }));
  const versions: Log[] = useMemo(() => (detail?.docinfo?.versions ?? []).flatMap((entry: any) => {
    let data: any;
    try { data = JSON.parse(entry.data || "{}"); } catch { return []; }
    const logs: Log[] = (data.changed ?? []).filter((change: [string, unknown, unknown]) =>
      !["created_by", "created_at", "item_number"].includes(change[0]),
    ).map((change: [string, unknown, unknown]) => {
      const field = meta?.fields?.find((item: { fieldname: string; fieldtype?: string }) => item.fieldname === change[0]);
      return {
        owner: entry.owner, owner_user_id: entry.owner, creation: entry.creation,
        comment_type: "Version Change",
        content: `changed <b>${field?.label || change[0]}</b> from ${versionValue(field?.fieldtype, change[1])} to ${versionValue(field?.fieldtype, change[2])}`,
      };
    });
    const { added, removed } = assignmentChange(data);
    const names = (ids: string[]) => ids.map((id) => escapeHtml(employeeName(id))).join(", ");
    const parts = [added.length && `added ${names(added)}`, removed.length && `removed ${names(removed)}`].filter(Boolean);
    if (parts.length) logs.push({
      owner: entry.owner, owner_user_id: entry.owner, creation: entry.creation,
      comment_type: "Version Change",
      content: `changed <b>Assigned Participants</b>: ${parts.join("; ")}`,
    });
    return logs;
  }), [detail?.docinfo?.versions, meta?.fields, employeeName]);
  const creationLogs: Log[] = createdBy && createdAt ? [{
    owner: createdBy, owner_user_id: createdBy, creation: createdAt,
    comment_type: "Creation", content: "",
  }] : [];
  const allLogs = useMemo(() => [...comments, ...versions, ...creationLogs].sort(
    (a, b) => new Date(b.creation).getTime() - new Date(a.creation).getTime(),
  ), [comments, versions, creationLogs]);
  const activity = allLogs.filter((log) => log.comment_type === "Version Change" || log.comment_type === "Creation");

  const submitComment = () => {
    const content = comment.trim();
    if (!content) return;
    addComment.mutate({ reference_doctype: doctype, reference_name: documentName, content,
      comment_by: currentJhUser?.full_name, comment_email: currentJhUser?.email }, {
      onSuccess: () => {
        setComment("");
        queryClient.invalidateQueries({ queryKey: ["DocInfo", { doctype, name: documentName }] });
        toast.success("Comment added");
      },
      onError: (error) => toast.error(error.message || "Could not add comment"),
    });
  };

  const Item = ({ log }: { log: Log }) => {
    const { data: user } = useJhUser(log.owner_user_id);
    return <div className="relative border-l border-gray-200 pb-5 pl-5 last:border-transparent last:pb-0">
      <span className="absolute -left-1 top-1 h-2 w-2 rounded-full bg-red-200" />
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-medium">{user?.full_name || log.owner}</span>
        <span className="text-sm text-gray-500">{log.comment_type === "Creation" ? `created the ${itemId ? "item" : "project"}` : log.comment_type === "Version Change" ? `updated the ${itemId ? "item" : "project"}` : "commented"}</span>
        <time className="text-xs text-gray-400" dateTime={log.creation}>
          {log.creation ? formatDistanceToNow(new Date(log.creation), { addSuffix: true }) : ""}
        </time>
      </div>
      {log.content && <div className="mt-1 flex items-start gap-2 text-sm text-gray-600">
        {log.comment_type === "Creation" ? <Plus className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" /> : log.comment_type !== "Version Change" && <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />}
        <p className="break-words" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(log.content) }} />
      </div>}
    </div>;
  };
  const render = (logs: Log[], empty: string) => loading
    ? <div className="space-y-4">{[0, 1].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
    : logs.length ? <div>{logs.map((log, i) => <Item key={`${log.creation}-${i}`} log={log} />)}</div>
      : <p className="py-5 text-center text-sm text-gray-500">{empty}</p>;

  return <section className="space-y-4 border-t pt-5">
    <Tabs defaultValue="all">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-bold">Timeline</h3>
        <TabsList className="bg-rose-50"><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="activity">Activity</TabsTrigger><TabsTrigger value="comments">Comments</TabsTrigger></TabsList>
      </div>
      <TabsContent value="all" className="mt-0">{render(allLogs, "No activity yet")}</TabsContent>
      <TabsContent value="activity" className="mt-0">{render(activity, "No activity yet")}</TabsContent>
      <TabsContent value="comments" className="mt-0">{render(comments, "No comments yet")}</TabsContent>
    </Tabs>
    <div className="flex gap-2 border-t pt-4">
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment..."
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }} />
      <Button onClick={submitComment} size="icon" className="shrink-0 bg-red-700 hover:bg-red-800" disabled={addComment.isPending || !comment.trim()} aria-label="Add comment"><Send className="h-4 w-4" /></Button>
    </div>
  </section>;
}
