import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { format } from "date-fns";
import { ArrowLeft, Download, FileEdit, FileText, ListPlus, Mail, Plus, Trash2, X } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/auth";
import { useDeleteDoc, useDoc, useDocDetail, useDocs, useSaveDoc, useUpdateDoc } from "@/hooks/doc";
import { useFileRemove, useFilesUpload } from "@/hooks/file";
import { useApproveRcaAndClose, useProjectItemAudit, useSendProjectItemEmail, useSoftDeleteProjectItem } from "@/hooks/project-items";
import { ProjectItemAuditEntry } from "@/hooks/project-items";
import { queryClient } from "@/utils/query-client";
import frappeClient from "@/utils/frappe-client";
import { JHUserMaster } from "@/types/JHDigitrack/JHUserMaster";
import { Attachment } from "@/types/doc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import DeleteConfirmation from "@/components/tasks/ui/DeleteConfirmation";
import { PaginationControls } from "@/components/tasks/task-table/pagination-controls";
import SearchBar from "@/components/tasks/ui/SearchBar";
import FileAttachmentHandler from "@/components/tasks/task-sheet/FileAttachmentHandler";
import ProjectTimeline from "./ProjectTimeline";
import SearchableFilterButton from "./SearchableFilterButton";
import SearchableSelect from "./SearchableSelect";
import SortableHeader from "./SortableHeader";
import StatusTimeline from "./StatusTimeline";
import { StatusStep, buildStatusSteps } from "./statusSteps";
import { MultiSelectCombobox } from "@/components/ui/multi-select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ITEM_DOCTYPE = "JH Project Item";
const SEVERITIES = ["Critical", "High", "Medium", "Low"];
const WORKFLOW_OPTIONS = [{ value: "Open", label: "Open" }, { value: "Closed", label: "Closed" }];
const SEVERITY_NUMBERS: Record<string, number> = { Critical: 1, High: 2, Medium: 3, Low: 4 };
const severityLabel = (severity: string, showNumber: boolean) =>
  showNumber ? `${String(SEVERITY_NUMBERS[severity] || 99).padStart(2, "0")} · ${severity}` : severity;
const TYPES = ["FR", "NFR", "Defect"];

type Project = { name: string; project_name: string; project_description?: string; due_date?: string; created_by?: string; owner?: string; creation?: string; modified?: string; modified_by?: string; status?: string; show_status_priority?: number; participants?: { employee: string }[] };
type WorkflowState = "Open" | "Closed";
type ItemStatus = { name: string; status_name: string; status_number: number; workflow_state?: WorkflowState };
export type ProjectItem = {
  name: string; project: string; item_number?: number; item_description: string;
  requirement_or_defect: string; due_date?: string; revised_due_date?: string;
  reported_site?: string; severity: string; status: string; created_by?: string;
  created_at?: string; owner?: string; creation?: string; modified?: string;
  modified_by?: string; deleted_at?: string; deleted_by?: string;
  rca_required?: number; rca_approved?: number; rca_approved_by?: string; rca_approved_at?: string; rca_approval_comments?: string;
  assigned_participants?: { employee: string }[];
};
type ItemForm = Pick<ProjectItem, "item_description" | "requirement_or_defect" | "due_date" | "revised_due_date" | "reported_site" | "severity" | "status" | "rca_required">;
const EMPTY_FORM: ItemForm = { item_description: "", requirement_or_defect: "FR", due_date: "", revised_due_date: "", reported_site: "", severity: "Medium", status: "Open", rca_required: 0 };
const taskDateClass = "pl-3 text-left font-normal w-full h-9 border rounded-sm";
const dateTime = (value?: string) => value ? new Date(value).toLocaleString() : "—";
const auditValue = (field: string, value: unknown) => {
  if (["RCA Required", "RCA Approved"].includes(field) && [0, 1, "0", "1"].includes(value as number | string)) {
    return Number(value) ? "Yes" : "No";
  }
  return String(value ?? "—");
};
const readableComment = (content = "") => {
  const doc = new DOMParser().parseFromString(content, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
};

function ItemRow({ item, index, page, pageSize, creatorName, statusNumber, showPriority, statusSteps, statusLabel, onOpen, onEdit, onDelete }: {
  item: ProjectItem; index: number; page: number; pageSize: number; creatorName: (id?: string) => string; statusNumber?: number; showPriority: boolean;
  statusSteps: StatusStep[]; statusLabel: (status: string) => string;
  onOpen: (item: ProjectItem) => void; onEdit: (item: ProjectItem) => void; onDelete: (item: ProjectItem) => void;
}) {
  const { data: detail } = useDocDetail({ doctype: ITEM_DOCTYPE, name: item.name });
  const comments = [...(detail?.docinfo?.comments ?? [])]
    .filter((entry: any) => entry.comment_type === "Comment")
    .sort((a: any, b: any) => new Date(b.creation).getTime() - new Date(a.creation).getTime())
    .slice(0, 2);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const previousStep = statusSteps.length > 1 ? statusSteps[statusSteps.length - 2] : undefined;
  const lastChangedAt = statusSteps[statusSteps.length - 1]?.at;
  return <>
  <tr className={`cursor-pointer align-top hover:bg-muted/30 ${timelineOpen ? "bg-muted/30" : ""}`} onClick={() => onOpen(item)}>
    <td className="px-2 py-3 text-center text-muted-foreground">{(page - 1) * pageSize + index + 1}</td>
    <td className="break-words px-2 py-3 font-medium text-[#972e26]">{item.name}</td>
    <td className="px-2 py-3"><p className="whitespace-pre-wrap">{item.item_description}</p><div className="mt-2 space-y-1 border-t pt-1.5"><p className="text-[11px] font-medium text-muted-foreground">Comments · Latest 2</p>{comments.length ? comments.map((comment: any) => <p key={comment.name} className="line-clamp-1 text-xs text-muted-foreground" title={readableComment(comment.content)}><span className="font-medium">{creatorName(comment.owner)}:</span> {readableComment(comment.content)}</p>) : <span className="text-xs text-muted-foreground">No comments yet</span>}</div></td>
    <td className="px-2 py-3">{item.requirement_or_defect}</td>
    <td className="whitespace-nowrap px-2 py-3">{item.due_date || "—"}</td>
    <td className="whitespace-nowrap px-2 py-3">{item.revised_due_date || "—"}</td>
    <td className="px-2 py-3">{item.reported_site || "—"}</td>
    <td className="px-2 py-3"><SeverityBadge severity={item.severity} showNumber={showPriority}/></td>
    <td className="px-2 py-3"><div className="space-y-1"><StatusBadge status={item.deleted_at ? "Deleted" : item.status} number={statusNumber}/>{previousStep && lastChangedAt && <button type="button" aria-expanded={timelineOpen} className="block text-left text-[11px] text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-[#972e26]" onClick={(event) => { event.stopPropagation(); setTimelineOpen(!timelineOpen); }}>{statusLabel(previousStep.status)} · {format(new Date(lastChangedAt), "d MMM yy")}</button>}</div></td>
    <td className="px-3 py-2 text-center" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-center">
      {!item.deleted_at && <Button variant="ghost" size="icon" aria-label={`Edit ${item.name}`} onClick={() => onEdit(item)}><FileEdit className="h-4 w-4"/></Button>}
      {!item.deleted_at && <Button variant="ghost" size="icon" aria-label={`Delete ${item.name}`} onClick={() => onDelete(item)}><Trash2 className="h-4 w-4"/></Button>}
    </div></td>
  </tr>
  {timelineOpen && <tr className="bg-muted/30">
    <td colSpan={10} className="border-t border-dashed px-4 py-1.5">
      <div className="flex items-start gap-3"><span className="shrink-0 pt-1 text-[11px] font-medium text-muted-foreground">Status timeline</span><StatusTimeline steps={statusSteps} statusLabel={statusLabel}/></div>
    </td>
  </tr>}
  </>;
}

function SeverityBadge({ severity, showNumber }: { severity: string; showNumber: boolean }) {
  const styles: Record<string, string> = { Critical: "bg-red-100 text-red-800", High: "bg-orange-100 text-orange-800", Medium: "bg-amber-100 text-amber-800", Low: "bg-slate-100 text-slate-700" };
  return <span className={`rounded-md px-2.5 py-1 text-xs ${styles[severity] || styles.Medium}`}>{severityLabel(severity, showNumber)}</span>;
}
function StatusBadge({ status, number }: { status: string; number?: number }) {
  return <span className={`inline-flex rounded-md px-2.5 py-1 text-xs ${status === "Closed" ? "bg-emerald-50 text-emerald-700" : status === "Deleted" ? "bg-gray-100 text-gray-700" : "bg-blue-50 text-blue-700"}`}>{number ? `${String(number).padStart(2, "0")} · ` : ""}{status}</span>;
}
function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return <><div className="text-sm text-gray-500">{label}</div><div className="min-w-0 break-words">{value || "—"}</div></>;
}

export default function ProjectItems() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const { data: project, isLoading: loadingProject, refetch: refetchProject } = useDoc<Project>({ doctype: "JH Project", name: projectId, disabled: !projectId });
  const { data: items = [], isLoading, refetch } = useDocs<ProjectItem>({ doctype: ITEM_DOCTYPE, fields: ["*"], filters: [["project", "=", projectId]], orderBy: { field: "modified", order: "desc" }, limit: 5000, enabled: Boolean(projectId) });
  const { data: statuses = [], refetch: refetchStatuses } = useDocs<ItemStatus>({ doctype: "JH Project Item Status", fields: ["name", "status_name", "status_number", "workflow_state"], orderBy: { field: "status_number", order: "asc" }, limit: 500 });
  const { data: auditLogs = [], isLoading: auditLoading } = useProjectItemAudit(projectId);
  const { data: users = [] } = useDocs<JHUserMaster>({ doctype: "JH User Master", fields: ["name", "full_name", "user", "email", "active"], limit: 0 });
  const { data: currentUser } = useCurrentUser();
  const saveDoc = useSaveDoc();
  const fileRemove = useFileRemove();
  const uploadFiles = useFilesUpload();
  const deleteDoc = useSoftDeleteProjectItem();
  const approveRca = useApproveRcaAndClose();
  const deleteStatusDoc = useDeleteDoc();
  const updateProject = useUpdateDoc();
  const sendEmail = useSendProjectItemEmail();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "item_description" | "requirement_or_defect" | "due_date" | "revised_due_date" | "reported_site" | "severity" | "status" | "modified" | "created_at">("modified");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [showDeleted, setShowDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<ProjectItem | null>(null);
  const [editing, setEditing] = useState<ProjectItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState<string[]>([]);
  const [emailCc, setEmailCc] = useState<string[]>([]);
  const [emailBcc, setEmailBcc] = useState<string[]>([]);
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSearch, setEmailSearch] = useState("");
  const [rcaDialogOpen, setRcaDialogOpen] = useState(false);
  const [rcaComments, setRcaComments] = useState("");
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusNumber, setNewStatusNumber] = useState("");
  const [newStatusWorkflow, setNewStatusWorkflow] = useState<WorkflowState>("Open");
  const [statusSaving, setStatusSaving] = useState(false);
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const { data: editingDetail } = useDocDetail({ doctype: ITEM_DOCTYPE, name: editing?.name || "", disabled: !editing });
  const { data: selectedDetail } = useDocDetail({ doctype: ITEM_DOCTYPE, name: selected?.name || "", disabled: !selected });

  // Without this guard an empty id matches the first employee with no linked
  // login, so an unapproved Item showed that employee as the RCA approver.
  const creatorName = (id?: string) => (id ? users.find((user) => user.user === id)?.full_name || id : "—");
  const workflowOf = (name?: string): WorkflowState => {
    const status = statuses.find((entry) => entry.name === name);
    return status?.workflow_state || "Open";
  };
  const editingLocked = Boolean(editing && workflowOf(editing.status) === "Closed");
  const statusesSorted = useMemo(() => [...statuses].sort((a, b) => a.status_number - b.status_number), [statuses]);
  // Older Projects saved before this field existed have no value; treat them as "show".
  const showStatusPriority = project?.show_status_priority !== 0;
  const auditByItem = useMemo(() => {
    const grouped = new Map<string, ProjectItemAuditEntry[]>();
    auditLogs.forEach((entry: ProjectItemAuditEntry) => grouped.set(entry.item_id, [...(grouped.get(entry.item_id) || []), entry]));
    return grouped;
  }, [auditLogs]);
  const statusLabel = (name: string) => {
    const status = statuses.find((entry) => entry.name === name);
    if (!status) return name;
    return showStatusPriority ? `${String(status.status_number).padStart(2, "0")} · ${status.status_name}` : status.status_name;
  };
  const toggleStatusPriority = async (checked: boolean) => {
    if (!project) return;
    try {
      await updateProject.mutateAsync({ doctype: "JH Project", name: project.name, doc: { show_status_priority: checked ? 1 : 0 } });
      await refetchProject();
    } catch (error) {
      console.error(error);
      toast.error("Could not update the Show Status Priority setting");
    }
  };
  const participantIds = Array.from(new Set((project?.participants || []).map((participant) => participant.employee)));
  const assignableIds = Array.from(new Set([...participantIds, ...assignedIds]));
  const participantName = (id: string) => users.find((user) => user.name === id)?.full_name || id;
  const toggleAssigned = (id: string, checked: boolean) => setAssignedIds(checked ? [...assignedIds, id] : assignedIds.filter((assigned) => assigned !== id));
  const emailOptions = users.filter((user) => user.active !== 0 && Boolean(user.email) && participantIds.includes(user.name)).map((user) => ({ value: user.name, label: `${user.full_name || user.name} · ${user.email}` }));
  const visibleEmailOptions = emailOptions.filter((option) => option.label.toLowerCase().includes(emailSearch.toLowerCase()));
  const lastModified = useMemo(() => {
    const records = [
      { modified: project?.modified, modified_by: project?.modified_by, owner: project?.owner },
      ...items.map((item) => ({ modified: item.modified, modified_by: item.modified_by, owner: item.owner })),
    ].filter((record) => record.modified);
    return records.sort((left, right) => new Date(right.modified!).getTime() - new Date(left.modified!).getTime())[0];
  }, [project?.modified, project?.modified_by, project?.owner, items]);
  const filteredItems = useMemo(() => {
    const searchText = search.toLowerCase();
    return items.filter((item) => (showDeleted || !item.deleted_at)
      && (!typeFilter || item.requirement_or_defect === typeFilter)
      && (!severityFilter || item.severity === severityFilter)
      && (!statusFilter || (statusFilter === "Deleted" ? Boolean(item.deleted_at) : !item.deleted_at && item.status === statusFilter))
      && (!searchText || `${item.name} ${item.item_description} ${item.requirement_or_defect} ${item.severity} ${item.status} ${item.reported_site || ""}`.toLowerCase().includes(searchText)));
  }, [items, showDeleted, typeFilter, severityFilter, statusFilter, search]);
  const sortedItems = useMemo(() => [...filteredItems].sort((a, b) => {
    let comparison = 0;
    if (sortBy === "severity") comparison = (SEVERITY_NUMBERS[a.severity] || 99) - (SEVERITY_NUMBERS[b.severity] || 99);
    else if (sortBy === "status") comparison = (statuses.find((status) => status.name === a.status)?.status_number || 999) - (statuses.find((status) => status.name === b.status)?.status_number || 999);
    else comparison = String(a[sortBy] || "").localeCompare(String(b[sortBy] || ""));
    return comparison * (sortDirection === "asc" ? 1 : -1);
  }), [filteredItems, sortBy, sortDirection, statuses]);
  const totalPages = Math.ceil(sortedItems.length / pageSize);
  const visibleItems = sortedItems.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => {
    if (totalPages === 0 && page !== 1) setPage(1);
    else if (totalPages > 0 && page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const invalidateItems = async (name?: string) => {
    await queryClient.invalidateQueries({ queryKey: ["Docs"] });
    await queryClient.invalidateQueries({ queryKey: ["ProjectItemAudit", projectId] });
    if (name) await queryClient.invalidateQueries({ queryKey: ["DocInfo", { doctype: ITEM_DOCTYPE, name }] });
    await refetch();
  };
  const beginCreate = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setAssignedIds(participantIds); setNewFiles([]); setFormOpen(true); };
  const beginEdit = async (item: ProjectItem) => {
    try {
      const latest = await frappeClient.db.getDoc(ITEM_DOCTYPE, item.name) as ProjectItem;
      setEditing(latest);
      setForm({ item_description: latest.item_description || "", requirement_or_defect: latest.requirement_or_defect || "FR", due_date: latest.due_date || "", revised_due_date: latest.revised_due_date || "", reported_site: latest.reported_site || "", severity: latest.severity || "Medium", status: latest.status || "Open", rca_required: latest.rca_required || 0 });
      setAssignedIds((latest.assigned_participants || []).map((row) => row.employee));
      setNewFiles([]);
      setSelected(null);
      setFormOpen(true);
    } catch (error) { console.error(error); toast.error("Could not load the latest Item"); }
  };
  const saveItemData = async (status = form.status) => {
      const saved = await saveDoc.mutateAsync({ doctype: ITEM_DOCTYPE, project: projectId, ...form, status,
        assigned_participants: assignedIds.map((employee) => ({ doctype: "JH Project Participant", employee })),
        ...(editing ? {
          name: editing.name, modified: editing.modified, owner: editing.owner, creation: editing.creation,
          created_by: editing.created_by, created_at: editing.created_at, item_number: editing.item_number,
          deleted_by: editing.deleted_by, deleted_at: editing.deleted_at,
          rca_approved: editing.rca_approved, rca_approved_by: editing.rca_approved_by,
          rca_approved_at: editing.rca_approved_at, rca_approval_comments: editing.rca_approval_comments,
        } : {}) });
      if (newFiles.length) {
        await uploadFiles.mutateAsync({ files: newFiles, doctype: ITEM_DOCTYPE, docname: saved.name, isPrivate: 1,
          onProgress: () => undefined, onComplete: (success) => { if (!success) toast.error("Some attachments could not be uploaded"); },
          onError: (error) => toast.error(`Attachment upload failed: ${error.message}`) });
      }
      return saved;
  };
  const saveItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.item_description.trim()) return toast.error("Item Description is required");
    if (form.rca_required && !editingLocked && workflowOf(form.status) === "Closed") {
      setRcaComments(""); setRcaDialogOpen(true); return;
    }
    setSaving(true);
    try {
      const saved = await saveItemData();
      toast.success(editingLocked && workflowOf(form.status) === "Open" ? "Item reopened and RCA approval reset" : editing ? "Item updated" : "Item created");
      setFormOpen(false); setEditing(null); setNewFiles([]);
      await invalidateItems(saved.name);
    } catch (error) { console.error(error); toast.error("Could not save Item"); }
    finally { setSaving(false); }
  };
  const approveAndClose = async () => {
    if (!rcaComments.trim()) return toast.error("RCA approval comments are required");
    const safeStatus = editing && workflowOf(editing.status) === "Open"
      ? editing.status
      : statusesSorted.find((status) => workflowOf(status.name) === "Open")?.name || "Open";
    setSaving(true);
    try {
      const saved = await saveItemData(safeStatus);
      await approveRca.mutateAsync({ item_name: saved.name, status: form.status, approval_comments: rcaComments.trim() });
      toast.success("RCA verified and Item closed");
      setRcaDialogOpen(false); setFormOpen(false); setEditing(null); setNewFiles([]); setRcaComments("");
      await invalidateItems(saved.name);
    } catch (error) { console.error(error); toast.error("Could not approve RCA and close Item"); }
    finally { setSaving(false); }
  };
  const addStatus = async () => {
    const statusName = newStatusName.trim();
    const statusNumber = Number(newStatusNumber);
    if (!statusName || !Number.isInteger(statusNumber) || statusNumber < 1) return toast.error("Enter a status name and positive sort number");
    setStatusSaving(true);
    try {
      await saveDoc.mutateAsync({ doctype: "JH Project Item Status", status_name: statusName, status_number: statusNumber, workflow_state: newStatusWorkflow });
      setNewStatusName(""); setNewStatusNumber(""); setNewStatusWorkflow("Open");
      await refetchStatuses(); toast.success("Status added");
    } catch (error) { console.error(error); toast.error("Could not add status"); }
    finally { setStatusSaving(false); }
  };
  const removeStatus = async (status: ItemStatus) => {
    try {
      await deleteStatusDoc.mutateAsync({ doctype: "JH Project Item Status", name: status.name });
      await refetchStatuses(); toast.success("Status removed");
    } catch (error) { console.error(error); toast.error("Cannot remove a status used by Items or required by the workflow"); }
  };
  const removeAttachment = async (file: Attachment) => {
    if (!editing) return;
    await fileRemove.mutateAsync({ fid: file.name, dt: ITEM_DOCTYPE, dn: editing.name });
    await queryClient.invalidateQueries({ queryKey: ["DocInfo", { doctype: ITEM_DOCTYPE, name: editing.name }] });
    toast.success(`${file.file_name} removed`);
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc.mutateAsync(deleteTarget.name);
      toast.success("Item deleted; its history and attachments were retained");
      setDeleteTarget(null); setSelected(null);
      await invalidateItems(deleteTarget.name);
    } catch (error) { console.error(error); toast.error("Could not delete Item"); }
  };
  const toggleSort = (field: typeof sortBy) => { if (sortBy === field) setSortDirection(sortDirection === "asc" ? "desc" : "asc"); else { setSortBy(field); setSortDirection("asc"); } setPage(1); };
  const submitEmail = async () => {
    if (!selected || !emailTo.length || !emailMessage.trim()) return toast.error("Choose at least one To participant and enter a message");
    try {
      await sendEmail.mutateAsync({ item_name: selected.name, recipients: emailTo, cc: emailCc, bcc: emailBcc, message: emailMessage.trim() });
      toast.success("Item email sent"); setEmailOpen(false); setEmailTo([]); setEmailCc([]); setEmailBcc([]); setEmailMessage("");
    } catch (error) { console.error(error); toast.error("Could not send Item email"); }
  };
  const currentAttachments = editingDetail?.docinfo?.attachments ?? [];
  const attachmentOwner = (fileName: string) => editingDetail?.docinfo?.attachment_logs?.find((log) => log.content?.includes(fileName))?.owner;

  if (loadingProject) return <div className="p-8 text-center text-muted-foreground">Loading project…</div>;
  if (!project) return <div className="p-8 text-center">Project not found.</div>;

  return <section className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <Button variant="ghost" className="mb-2 -ml-3" onClick={() => navigate("/jh-digitrack/projects")}><ArrowLeft className="mr-2 h-4 w-4"/>Projects</Button>
        <p className="text-sm text-muted-foreground">{project.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{project.project_name}</h1>
      </div>
    </div>
    <div className="grid gap-3 rounded-md border bg-white p-4 text-sm sm:grid-cols-3">
      <div><span className="text-muted-foreground">Project created by</span><p className="mt-1 font-medium">{creatorName(project.created_by || project.owner)} · {dateTime(project.creation)}</p></div>
      <div><span className="text-muted-foreground">Project / Items last modified</span><p className="mt-1 font-medium">{creatorName(lastModified?.modified_by || lastModified?.owner)} · {dateTime(lastModified?.modified)}</p></div>
      <div><span className="text-muted-foreground">Items / Deleted</span><p className="mt-1 font-medium">{items.filter((item) => !item.deleted_at).length} / {items.filter((item) => item.deleted_at).length}</p></div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="w-64"><SearchBar value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search by description..."/></div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={showDeleted ? "default" : "outline"} size="sm" onClick={() => { setShowDeleted(!showDeleted); setPage(1); }}>{showDeleted ? "Showing deleted" : "Show deleted"}</Button>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <SearchableFilterButton label="Req/Defect" value={typeFilter} options={TYPES.map((value) => ({ value, label: value }))} onChange={(value) => { setTypeFilter(value); setPage(1); }} />
      <SearchableFilterButton label="Severity" value={severityFilter} options={SEVERITIES.map((value) => ({ value, label: severityLabel(value, showStatusPriority) }))} onChange={(value) => { setSeverityFilter(value); setPage(1); }} />
      <SearchableFilterButton label="Status" value={statusFilter} options={[...statusesSorted.map((status) => ({ value: status.name, label: statusLabel(status.name) })), { value: "Deleted", label: "Deleted" }]} onChange={(value) => { setStatusFilter(value); setPage(1); }} />
      <Button variant="outline" className="h-10 border-dashed" onClick={() => { setNewStatusNumber(String(Math.max(0, ...statuses.map((status) => status.status_number)) + 1)); setStatusDialogOpen(true); }}><ListPlus className="mr-2 h-4 w-4"/>Manage Statuses</Button>
      <Button variant="outline" className="h-10" onClick={() => {
        const rows = sortedItems.map((item) => ({ "Item ID": item.name, "Item Description": item.item_description, "Req/Defect": item.requirement_or_defect, "Due Date (Actual)": item.due_date || "", "Revised Due Date": item.revised_due_date || "", "Reported Site": item.reported_site || "", Severity: severityLabel(item.severity, showStatusPriority), Status: statusLabel(item.status), "RCA Required": item.rca_required ? "Yes" : "No", "Created By": item.created_by || item.owner || "", "Last Modified": item.modified || "" }));
        const sheet = XLSX.utils.json_to_sheet(rows); const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, "Project Items"); XLSX.writeFile(book, `${project.name}-items-${new Date().toISOString().slice(0, 10)}.xlsx`);
      }}><Download className="mr-2 h-4 w-4"/>Download Excel</Button>
    </div>

    <div className="overflow-x-auto rounded-md border bg-white">
      <div className="flex items-center justify-between gap-3 border-b bg-rose-50/70 px-4 py-2"><div><h2 className="font-semibold">Items</h2><p className="text-xs text-muted-foreground">{project.name} · {project.project_name} · Project due: {project.due_date || "Not set"}</p></div><Button className="bg-[#972e26] hover:bg-[#972e26]/90" onClick={beginCreate}><Plus className="mr-2 h-4 w-4"/>Create Item</Button></div>
      <table className="w-full min-w-[1180px] table-fixed text-left text-sm">
        <colgroup><col className="w-9"/><col className="w-32"/><col className="w-[220px]"/><col className="w-24"/><col className="w-28"/><col className="w-28"/><col className="w-24"/><col className="w-20"/><col className="w-32"/><col className="w-28"/></colgroup>
        <thead className="border-b text-muted-foreground"><tr><th className="px-2 py-3 text-center">#</th>{([ ["Item ID", "name"], ["Item Description", "item_description"], ["Req/Defect", "requirement_or_defect"], ["Due Date (Actual)", "due_date"], ["Revised Due Date", "revised_due_date"], ["Reported Site", "reported_site"], ["Severity", "severity"], ["Status", "status"] ] as [string, typeof sortBy][]).map(([label, field]) => <SortableHeader key={field} label={label} active={sortBy === field} direction={sortDirection} onClick={() => toggleSort(field)}/>)}<th className="px-2 py-3 text-center">Actions</th></tr></thead>
        <tbody className="divide-y">
          {isLoading ? <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Loading items…</td></tr> : !sortedItems.length ? <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">No items found. Create an item to get started.</td></tr> : visibleItems.map((item, index) => <ItemRow key={item.name} item={item} index={index} page={page} pageSize={pageSize} creatorName={creatorName} statusNumber={showStatusPriority ? statuses.find((status) => status.name === item.status)?.status_number : undefined} showPriority={showStatusPriority} statusSteps={buildStatusSteps(auditByItem.get(item.name) || [], item.status, item.created_at || item.creation)} statusLabel={statusLabel} onOpen={setSelected} onEdit={beginEdit} onDelete={setDeleteTarget}/>) }
        </tbody>
        {sortedItems.length > 0 && <tfoot><tr><td colSpan={10} className="border-t"><PaginationControls tasksPerPage={pageSize} setTasksPerPage={(size) => { setPageSize(size); setPage(1); }} totalPages={totalPages} currentPage={page} setCurrentPage={setPage}/></td></tr></tfoot>}
      </table>
    </div>

    <section className="overflow-hidden rounded-md border bg-white">
      <div className="border-b px-4 py-3"><h2 className="font-semibold">Activities</h2></div>
      {auditLoading ? <p className="p-6 text-center text-sm text-muted-foreground">Loading activities…</p> : !auditLogs.length ? <p className="p-6 text-center text-sm text-muted-foreground">No item activities yet.</p> : <ol className="max-h-[480px] space-y-0 overflow-y-auto px-5 py-4">{auditLogs.map((entry: ProjectItemAuditEntry, index: number) => {
        const EventIcon = entry.event === "Item created" ? Plus : entry.event === "Item deleted" ? Trash2 : FileEdit;
        return <li key={`${entry.item_id}-${entry.event}-${entry.timestamp}-${index}`} className="relative ml-3 border-l pb-6 pl-7 last:border-transparent last:pb-1">
          <span className="absolute -left-[17px] top-0 flex h-8 w-8 items-center justify-center rounded-full border bg-white text-[#972e26]"><EventIcon className="h-4 w-4"/></span>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><div><span className="font-medium">{creatorName(entry.user)}</span><span className="text-muted-foreground"> {entry.event.toLowerCase()} </span><span className="font-medium">{entry.item_id}</span></div><time className="text-xs text-muted-foreground">{dateTime(entry.timestamp)}</time></div>
          <p className="mt-1 text-sm text-muted-foreground">{entry.item_description}</p>
          {entry.changes.length > 0 && <ul className="mt-2 space-y-1 rounded-md bg-muted/30 px-3 py-2 text-sm">{entry.changes.map((change, changeIndex) => <li key={`${change.field}-${changeIndex}`}><span className="font-medium">{change.field}:</span> {auditValue(change.field, change.from)} <span className="px-1 text-muted-foreground">→</span> {auditValue(change.field, change.to)}</li>)}</ul>}
        </li>;
      })}</ol>}
    </section>

    <Sheet open={formOpen} onOpenChange={setFormOpen}>
      <SheetContent className="px-5 sm:max-w-5xl">
        <SheetHeader className="flex-row items-center justify-between px-0"><SheetTitle className="max-w-[100ch] truncate text-2xl font-semibold">{editing ? "Edit Item" : "Create Item"}</SheetTitle><SheetClose asChild><Button variant="ghost" size="icon" aria-label="Close"><X className="size-4"/></Button></SheetClose></SheetHeader>
        <form onSubmit={saveItem} className="relative">
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="space-y-6 py-5 pb-28 pr-4">
              {editingLocked && <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">This Item is closed, so its RCA fields are locked. To change them, move the Status to an Open workflow status. This resets the RCA approval.</div>}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="item-project">Project</Label><Input id="item-project" value={`${project.name} · ${project.project_name}`} readOnly/></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="item-description">Item Description</Label><Textarea id="item-description" rows={5} required value={form.item_description} onChange={(e) => setForm({ ...form, item_description: e.target.value })}/></div>
                <div className="space-y-2"><Label htmlFor="item-type">Req/Defect <span className="text-red-600">*</span></Label><SearchableSelect id="item-type" options={TYPES.map((value) => ({ value, label: value }))} value={form.requirement_or_defect} onChange={(value) => setForm({ ...form, requirement_or_defect: value })} placeholder="Select requirement or defect"/></div>
                <div className="space-y-2"><Label htmlFor="item-severity">Severity <span className="text-red-600">*</span></Label><SearchableSelect id="item-severity" options={SEVERITIES.map((value) => ({ value, label: severityLabel(value, showStatusPriority) }))} value={form.severity} onChange={(value) => setForm({ ...form, severity: value })} placeholder="Select severity"/></div>
                <div className="space-y-2"><Label htmlFor="item-due-date">Due Date (Actual)</Label><input id="item-due-date" type="date" className={taskDateClass} value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}/></div>
                <div className="space-y-2"><Label htmlFor="item-revised-date">Revised Due Date</Label><input id="item-revised-date" type="date" className={taskDateClass} value={form.revised_due_date} onChange={(e) => setForm({ ...form, revised_due_date: e.target.value })}/></div>
                <div className="space-y-2"><Label htmlFor="item-status">Status <span className="text-red-600">*</span></Label><SearchableSelect id="item-status" options={statusesSorted.map((status) => ({ value: status.name, label: statusLabel(status.name) }))} value={form.status} onChange={(value) => setForm({ ...form, status: value })} placeholder="Select status"/></div>
                <div className="space-y-2 sm:col-span-2"><div className="flex items-center justify-between"><Label>Assigned Participants</Label>{assignableIds.length > 0 && <div className="flex gap-3 text-xs"><button type="button" className="text-[#972e26] hover:underline" onClick={() => setAssignedIds(assignableIds)}>Select all</button><button type="button" className="text-muted-foreground hover:underline" onClick={() => setAssignedIds([])}>Clear</button></div>}</div>{assignableIds.length ? <div className="grid max-h-40 gap-2 overflow-y-auto rounded-md border p-3 sm:grid-cols-3">{assignableIds.map((id) => <label key={id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#972e26]" checked={assignedIds.includes(id)} onChange={(event) => toggleAssigned(id, event.target.checked)}/><span className="truncate">{participantName(id)}</span></label>)}</div> : <p className="text-sm text-muted-foreground">This Project has no participants.</p>}</div>
                <div className="flex items-center gap-3 sm:col-span-2"><input id="rca-required" type="checkbox" className="h-4 w-4 accent-[#972e26]" checked={Boolean(form.rca_required)} disabled={Boolean(editing?.rca_required) || editingLocked} onChange={(event) => setForm({ ...form, rca_required: event.target.checked ? 1 : 0 })}/><Label htmlFor="rca-required">RCA Required</Label><input id="rca-verified" type="checkbox" className="ml-4 h-4 w-4 accent-emerald-600" checked={Boolean(editing?.rca_approved)} disabled readOnly/><Label htmlFor="rca-verified" className="text-muted-foreground">RCA Verified</Label>{Boolean(editing?.rca_approved) && <span className="text-sm text-emerald-700">By {creatorName(editing.rca_approved_by)} · {dateTime(editing.rca_approved_at)}</span>}</div>
                <div className="space-y-2"><Label htmlFor="reported-site">Reported Site</Label><Input id="reported-site" value={form.reported_site} onChange={(e) => setForm({ ...form, reported_site: e.target.value })}/></div>
                {editing && <>
                  <div className="space-y-2"><Label>Created By</Label><Input value={creatorName(editing.created_by || editing.owner)} readOnly/></div>
                  <div className="space-y-2"><Label>Created Date Time</Label><Input value={dateTime(editing.created_at || editing.creation)} readOnly/></div>
                </>}
              </div>
              <FileAttachmentHandler key={editing?.name || "new-item"} allowedExtensions={["xls", "xlsx", "pdf", "doc", "docx"]} existingFiles={currentAttachments} onFilesChange={setNewFiles} onExistingFileRemove={removeAttachment} getAttachmentOwner={attachmentOwner} currentUser={currentUser} taskOwner={editing?.owner}/>
              {editing && <ProjectTimeline itemId={editing.name} createdBy={editing.created_by || editing.owner} createdAt={editing.created_at || editing.creation} employeeName={participantName} />}
            </div>
          </ScrollArea>
          <SheetFooter className="absolute bottom-0 w-full flex-col bg-white"><Separator className="my-4"/><div className="flex w-full"><SheetClose asChild><Button variant="outline" type="button" className="mr-2 w-full">Cancel</Button></SheetClose><Button type="submit" disabled={saving} className="w-full bg-[#972e26] hover:bg-[#972e26]/90">{saving ? "Saving…" : editing ? "Update Item" : "Create Item"}</Button></div></SheetFooter>
        </form>
      </SheetContent>
    </Sheet>

    <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
      <SheetContent className="overflow-y-auto p-0 sm:max-w-5xl">
        <div className="flex items-center justify-between border-b p-4"><StatusBadge status={selected?.deleted_at ? "Deleted" : selected?.status || "Open"}/><div className="mr-5 flex gap-2">
          {!selected?.deleted_at && <Button variant="ghost" size="icon" aria-label="Email item participants" onClick={() => { setEmailTo([]); setEmailCc([]); setEmailBcc([]); setEmailMessage(""); setEmailOpen(true); }}><Mail className="h-5 w-5"/></Button>}
          {!selected?.deleted_at && <Button variant="ghost" size="icon" aria-label="Edit item" onClick={() => selected && beginEdit(selected)}><FileEdit className="h-5 w-5"/></Button>}
          {!selected?.deleted_at && <Button variant="ghost" size="icon" aria-label="Delete item" onClick={() => selected && setDeleteTarget(selected)}><Trash2 className="h-5 w-5"/></Button>}
          <SheetClose asChild><Button variant="ghost" size="icon" aria-label="Close item details"><X className="size-4"/></Button></SheetClose>
        </div></div>
        <div className="space-y-6 p-6"><div><p className="text-sm text-gray-500">{selected?.name}</p><h2 className="mt-1 text-2xl font-bold">{selected?.item_description}</h2></div>
          <div className="grid grid-cols-[150px_1fr] gap-y-5"><DetailField label="Item ID" value={selected?.name}/><DetailField label="Item Description" value={selected?.item_description}/><DetailField label="Project" value={`${project.name} · ${project.project_name}`}/><DetailField label="Req/Defect" value={selected?.requirement_or_defect}/><DetailField label="Severity" value={selected && <SeverityBadge severity={selected.severity} showNumber={showStatusPriority}/>}/><DetailField label="Status" value={selected && <StatusBadge status={statusLabel(selected.status)} number={undefined}/>}/><DetailField label="Due Date (Actual)" value={selected?.due_date}/><DetailField label="Revised Due Date" value={selected?.revised_due_date}/><DetailField label="Reported Site" value={selected?.reported_site}/><DetailField label="Assigned Participants" value={((selectedDetail?.docs?.[0] as ProjectItem | undefined)?.assigned_participants || []).map((row) => participantName(row.employee)).join(", ")}/><DetailField label="RCA Required" value={selected?.rca_required ? "Yes" : "No"}/>{Boolean(selected?.rca_required) && <><DetailField label="RCA Approved" value={selected.rca_approved ? "Yes" : "No"}/><DetailField label="RCA Approved By" value={creatorName(selected.rca_approved_by)}/><DetailField label="RCA Approved At" value={dateTime(selected.rca_approved_at)}/><DetailField label="RCA Approval Comments" value={selected.rca_approval_comments}/></>}<DetailField label="Created By" value={selected && creatorName(selected.created_by || selected.owner)}/><DetailField label="Created Date Time" value={dateTime(selected?.created_at || selected?.creation)}/><DetailField label="Last Modified" value={selected && `${creatorName(selected.modified_by)} · ${dateTime(selected.modified)}`}/>{selected?.deleted_at && <DetailField label="Deleted By" value={`${creatorName(selected.deleted_by)} · ${dateTime(selected.deleted_at)}`}/>}</div>
          <section className="space-y-3 border-t pt-5"><h3 className="font-semibold">Attachments</h3>{(selectedDetail?.docinfo?.attachments || []).length ? <div className="flex flex-wrap gap-3">{selectedDetail!.docinfo.attachments.map((file: Attachment) => <a key={file.name} href={file.file_url} target="_blank" rel="noreferrer" className="flex max-w-72 items-center gap-2 rounded-md border p-3 text-sm hover:bg-muted"><FileText className="h-4 w-4 shrink-0"/><span className="truncate">{file.file_name}</span></a>)}</div> : <p className="text-sm text-muted-foreground">No attachments</p>}</section>
          {selected && <ProjectTimeline itemId={selected.name} createdBy={selected.created_by || selected.owner} createdAt={selected.created_at || selected.creation} employeeName={participantName} />}
        </div>
      </SheetContent>
    </Sheet>
    <Dialog open={emailOpen} onOpenChange={setEmailOpen}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Email Item participants</DialogTitle><DialogDescription>Choose recipients from this Project’s Participant List and add a message.</DialogDescription></DialogHeader><div className="space-y-4"><div><Label>To <span className="text-red-600">*</span></Label><MultiSelectCombobox options={visibleEmailOptions} selectedOptions={emailOptions} selected={emailTo} onChange={setEmailTo} onSearch={setEmailSearch} searchKeyword={emailSearch} placeholder="Select To participants" emptyMessage="No project participants with email addresses."/></div><div><Label>CC</Label><MultiSelectCombobox options={visibleEmailOptions} selectedOptions={emailOptions} selected={emailCc} onChange={setEmailCc} onSearch={setEmailSearch} searchKeyword={emailSearch} placeholder="Select CC participants" emptyMessage="No project participants with email addresses."/></div><div><Label>BCC</Label><MultiSelectCombobox options={visibleEmailOptions} selectedOptions={emailOptions} selected={emailBcc} onChange={setEmailBcc} onSearch={setEmailSearch} searchKeyword={emailSearch} placeholder="Select BCC participants" emptyMessage="No project participants with email addresses."/></div><div><Label htmlFor="item-email-message">Message <span className="text-red-600">*</span></Label><Textarea id="item-email-message" rows={5} value={emailMessage} onChange={(event) => setEmailMessage(event.target.value)} placeholder="Write a message about this Item…"/></div></div><DialogFooter><Button variant="outline" onClick={() => setEmailOpen(false)}>Cancel</Button><Button disabled={sendEmail.isPending} onClick={submitEmail} className="bg-[#972e26] hover:bg-[#972e26]/90">{sendEmail.isPending ? "Sending…" : "Send Email"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={rcaDialogOpen} onOpenChange={setRcaDialogOpen}><DialogContent><DialogHeader><DialogTitle>Verify RCA and close Item</DialogTitle><DialogDescription>Moving an Item marked RCA Required to a Closed workflow status needs an approval comment. The Item is then locked until it is moved back to an Open workflow status. The approver, time, and comment will be saved in the Item audit trail.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="rca-approval-comments">Approval comments <span className="text-red-600">*</span></Label><Textarea id="rca-approval-comments" rows={4} value={rcaComments} onChange={(event) => setRcaComments(event.target.value)} placeholder="Summarize the RCA verification or approval…"/></div><DialogFooter><Button variant="outline" onClick={() => setRcaDialogOpen(false)}>Cancel</Button><Button disabled={saving || !rcaComments.trim()} onClick={approveAndClose} className="bg-[#972e26] hover:bg-[#972e26]/90">{saving ? "Saving…" : "Verify RCA and Close"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Manage Item Statuses</DialogTitle><DialogDescription>Statuses are numbered for sorting. Every status needs a Workflow, which cannot be changed after the status is created. Items in an Open workflow status are included in the Project's update email. A status in use by an Item cannot be removed. Keep at least one Open and one Closed workflow status.</DialogDescription></DialogHeader><div className="flex items-start gap-3 rounded-md border bg-muted/30 px-3 py-2"><input id="show-status-priority" type="checkbox" className="mt-0.5 h-4 w-4 accent-[#972e26]" checked={showStatusPriority} disabled={!project || updateProject.isPending} onChange={(event) => toggleStatusPriority(event.target.checked)}/><div><Label htmlFor="show-status-priority">Show priority</Label></div></div><div className="max-h-56 space-y-2 overflow-y-auto">{statusesSorted.map((status) => <div key={status.name} className="flex items-center justify-between rounded-md border px-3 py-2"><span className="min-w-0 flex-1 truncate">{String(status.status_number).padStart(2, "0")} · {status.status_name}</span><span className={`shrink-0 rounded-md px-2 py-0.5 text-xs ${status.workflow_state === "Closed" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{status.workflow_state || "Open"}</span><Button variant="ghost" size="icon" aria-label={`Remove ${status.status_name}`} onClick={() => removeStatus(status)}><Trash2 className="h-4 w-4"/></Button></div>)}</div><div className="grid gap-3 border-t pt-4 sm:grid-cols-[1fr_100px_140px]"><div><Label htmlFor="new-item-status">Status Name</Label><Input id="new-item-status" value={newStatusName} onChange={(event) => setNewStatusName(event.target.value)} placeholder="e.g. Security Testing"/></div><div><Label htmlFor="new-item-status-number">Sort Number</Label><Input id="new-item-status-number" type="number" min="1" value={newStatusNumber} onChange={(event) => setNewStatusNumber(event.target.value)}/></div><div><Label htmlFor="new-item-status-workflow">Workflow <span className="text-red-600">*</span></Label><SearchableSelect id="new-item-status-workflow" options={WORKFLOW_OPTIONS} value={newStatusWorkflow} onChange={(value) => setNewStatusWorkflow(value as WorkflowState)} placeholder="Select workflow"/></div></div><DialogFooter><Button disabled={statusSaving} onClick={addStatus}><Plus className="mr-2 h-4 w-4"/>{statusSaving ? "Adding…" : "Add Status"}</Button></DialogFooter></DialogContent></Dialog>
    <DeleteConfirmation open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} taskName={deleteTarget?.item_description || deleteTarget?.name} itemLabel="item" onConfirm={confirmDelete}/>
  </section>;
}
