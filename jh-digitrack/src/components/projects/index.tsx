import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { FileEdit, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useDocs, useDeleteDoc, useSaveDoc } from "@/hooks/doc";
import { useCurrentUser } from "@/hooks/auth";
import { JHUserMaster } from "@/types/JHDigitrack/JHUserMaster";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import SearchBar from "@/components/tasks/ui/SearchBar";
import ActionButtons from "@/components/tasks/ui/ActionButtons";
import DeleteConfirmation from "@/components/tasks/ui/DeleteConfirmation";
import ProjectTimeline from "./ProjectTimeline";
import { PaginationControls } from "@/components/tasks/task-table/pagination-controls";
import frappeClient from "@/utils/frappe-client";
import SearchableFilterButton from "./SearchableFilterButton";
import SearchableSelect from "./SearchableSelect";
import SortableHeader from "./SortableHeader";
import { MultiSelectCombobox } from "@/components/ui/multi-select";

type Participant = { employee: string; full_name?: string; employee_code?: string };
type Business = { name: string; business_name?: string; active?: number };
type Project = {
  name: string;
  project_name: string;
  project_description?: string;
  business_unit?: string;
  start_date?: string;
  due_date?: string;
  update_email_interval_days?: number;
  last_update_email_sent_on?: string;
  status: "Open" | "In Progress" | "Closed" | "Cancelled";
  participants?: Participant[];
  created_by?: string;
  created_at?: string;
  owner?: string;
  creation?: string;
  modified?: string;
};
const STATUS = ["Open", "In Progress", "Closed", "Cancelled"] as const;
const taskDateClass = "pl-3 text-left font-normal w-full h-9 border rounded-sm";

function Projects() {
  const { data: projects = [], isLoading, refetch } = useDocs<Project>({
    doctype: "JH Project", fields: ["*"], limit: 500,
  });
  const { data: projectItems = [], isLoading: itemsLoading, isError: itemsError } = useDocs<{ name: string; project: string }>({
    doctype: "JH Project Item", fields: ["name", "project"], limit: 5000,
  });
  const { data: employees = [] } = useDocs<JHUserMaster>({
    doctype: "JH User Master", fields: ["name", "full_name", "employee_code", "active", "email", "user"], limit: 0, // 0 = no limit: list every employee
  });
  const { data: businesses = [] } = useDocs<Business>({ doctype: "JH Business Master", fields: ["name", "business_name"], limit: 1000 });
  const navigate = useNavigate();
  const saveDoc = useSaveDoc();
  const deleteDoc = useDeleteDoc();
  const { data: currentUser } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("my-projects");
  const [statusFilter, setStatusFilter] = useState("");
  const [createdByFilter, setCreatedByFilter] = useState("");
  const [dueDateFilter, setDueDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<"name" | "project_name" | "status" | "due_date" | "created_by" | "modified">("modified");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [modal, setModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [participantSearch, setParticipantSearch] = useState("");
  const [form, setForm] = useState({ project_name: "", project_description: "", business_unit: "", start_date: "", due_date: "", update_email_interval_days: 0, status: "Open" as Project["status"] });
  const participantOptions = employees.filter((employee) => employee.active !== 0 && employee.email).map((employee) => ({
    value: employee.name,
    label: `${employee.full_name || employee.name}${employee.email ? ` · ${employee.email}` : ""}`,
  }));
  const visibleParticipantOptions = participantOptions.filter((option) => option.label.toLowerCase().includes(participantSearch.toLowerCase()));
  const creatorOptions = Array.from(new Set(projects.map((project) => project.created_by || project.owner).filter((creator): creator is string => Boolean(creator))))
    .map((creator) => ({ value: creator, label: employees.find((employee) => employee.user === creator)?.full_name || creator }));
  const projectsWithItems = new Set(projectItems.map((item) => item.project));
  const shown = useMemo(() => projects.filter((p) => {
    const matchesSearch = `${p.name} ${p.project_name} ${p.business_unit ?? ""} ${p.status}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || p.status === statusFilter;
    const matchesCreator = !createdByFilter || (p.created_by || p.owner) === createdByFilter;
    const matchesDueDate = !dueDateFilter || (dueDateFilter === "none" ? !p.due_date : dueDateFilter === "overdue" ? Boolean(p.due_date && p.due_date < new Date().toISOString().slice(0, 10)) : Boolean(p.due_date && p.due_date >= new Date().toISOString().slice(0, 10)));
    const matchesOwner = activeTab !== "created-by-me" || (p.created_by || p.owner) === currentUser;
    return matchesSearch && matchesStatus && matchesCreator && matchesDueDate && matchesOwner;
  }).sort((a, b) => {
    const av = sortBy === "created_by" ? (a.created_by || a.owner || "") : (a[sortBy] || "");
    const bv = sortBy === "created_by" ? (b.created_by || b.owner || "") : (b[sortBy] || "");
    return String(av).localeCompare(String(bv)) * (sortDirection === "asc" ? 1 : -1);
  }), [projects, search, statusFilter, createdByFilter, dueDateFilter, activeTab, currentUser, sortBy, sortDirection]);
  const toggleSort = (field: typeof sortBy) => { if (sortBy === field) setSortDirection(sortDirection === "asc" ? "desc" : "asc"); else { setSortBy(field); setSortDirection("asc"); } setCurrentPage(1); };
  const totalPages = Math.ceil(shown.length / pageSize);
  const visibleProjects = shown.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => {
    if (totalPages === 0 && currentPage !== 1) setCurrentPage(1);
    else if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const beginCreate = () => {
    setEditing(null); setParticipantIds([]); setParticipantSearch("");
    setForm({ project_name: "", project_description: "", business_unit: "", start_date: "", due_date: "", update_email_interval_days: 0, status: "Open" });
    setModal(true);
  };
  const beginEdit = async (project: Project) => {
    try {
      const latestProject = await frappeClient.db.getDoc("JH Project", project.name) as Project;
      setEditing(latestProject);
      setParticipantSearch("");
      setParticipantIds((latestProject.participants ?? []).map((p) => typeof p === "string" ? p : p.employee));
      setForm({ project_name: latestProject.project_name, project_description: latestProject.project_description ?? "", business_unit: latestProject.business_unit ?? "", start_date: latestProject.start_date ?? "", due_date: latestProject.due_date ?? "", update_email_interval_days: latestProject.update_email_interval_days ?? 0, status: latestProject.status });
      setModal(true);
    } catch (error) {
      console.error(error);
      toast.error("Could not load the latest project. Refresh the list and try again.");
    }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.project_name.trim()) return toast.error("Project Name is required");
    if (form.start_date && form.due_date && form.due_date < form.start_date) return toast.error("Due Date must be on or after Start Date");
    if (!Number.isInteger(form.update_email_interval_days) || form.update_email_interval_days < 0 || form.update_email_interval_days > 365) return toast.error("Update Email Interval must be a whole number from 0 to 365");
    setSaving(true);
    try {
      // savedocs replaces the whole record, so an edit starts from the latest
      // saved Project. Fields that are not on this form (Show Status Priority,
      // Last Update Email Sent On, Created By, Created At) keep their values.
      const doc = {
        ...(editing ?? {}), doctype: "JH Project", ...form,
        participants: participantIds.map((employee) => ({ doctype: "JH Project Participant", employee })),
      };
      await saveDoc.mutateAsync(doc);
      toast.success(editing ? "Project updated" : "Project created");
      setModal(false); await refetch();
    } catch (error) {
      console.error(error); toast.error("Could not save project");
    } finally { setSaving(false); }
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc.mutateAsync({ doctype: "JH Project", name: deleteTarget.name });
      toast.success("Project deleted");
      setDeleteTarget(null);
      await refetch();
    } catch (error) {
      console.error(error);
      toast.error("Could not delete project");
    }
  };
  return <section className="space-y-6">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
    </div>
    <Tabs value={activeTab} onValueChange={(value) => {
      if (value === "dashboard") { window.location.href = "/jh-digitrack/dashboard"; return; }
      setActiveTab(value);
      setCurrentPage(1);
    }}>
      <TabsList className="h-11 w-fit bg-rose-50 p-1">
        <TabsTrigger value="dashboard" className="data-[state=active]:bg-white text-gray-700 px-4">Dashboard</TabsTrigger>
        <TabsTrigger value="my-projects" className="data-[state=active]:bg-white text-gray-700 px-4">My Projects</TabsTrigger>
        <TabsTrigger value="created-by-me" className="data-[state=active]:bg-white text-gray-700 px-4">Created By Me</TabsTrigger>
        <TabsTrigger value="team-projects" className="data-[state=active]:bg-white text-gray-700 px-4">Team Projects</TabsTrigger>
      </TabsList>
    </Tabs>
    <div className="flex items-center justify-between gap-3">
      <div className="w-56"><SearchBar value={search} onChange={(value) => { setSearch(value); setCurrentPage(1); }} placeholder="Search projects..." /></div>
      <div className="flex items-center gap-2">
        <ActionButtons onCreateTask={beginCreate} label="Create Project" />
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <SearchableFilterButton label="Status" value={statusFilter} options={STATUS.map((status) => ({ value: status, label: status }))} onChange={(value) => { setStatusFilter(value); setCurrentPage(1); }} />
      <SearchableFilterButton label="Created By" value={createdByFilter} options={creatorOptions} onChange={(value) => { setCreatedByFilter(value); setCurrentPage(1); }} searchPlaceholder="Search users..." />
      <SearchableFilterButton label="Due Date" icon="calendar" value={dueDateFilter} options={[{ value: "upcoming", label: "Upcoming" }, { value: "overdue", label: "Overdue" }, { value: "none", label: "No Due Date" }]} onChange={(value) => { setDueDateFilter(value); setCurrentPage(1); }} />
    </div>
    <div className="overflow-x-auto rounded-md border bg-white"><table className="w-full min-w-[950px] text-left text-sm"><thead className="border-b text-muted-foreground"><tr><th className="px-3 py-3">#</th><SortableHeader label="Project ID" active={sortBy === "name"} direction={sortDirection} onClick={() => toggleSort("name")}/><SortableHeader label="Project Name" active={sortBy === "project_name"} direction={sortDirection} onClick={() => toggleSort("project_name")}/><SortableHeader label="Status" active={sortBy === "status"} direction={sortDirection} onClick={() => toggleSort("status")}/><SortableHeader label="Due Date" active={sortBy === "due_date"} direction={sortDirection} onClick={() => toggleSort("due_date")}/><SortableHeader label="Created By" active={sortBy === "created_by"} direction={sortDirection} onClick={() => toggleSort("created_by")}/><th className="px-3 py-3 text-center">Actions</th></tr></thead><tbody className="divide-y">
      {isLoading ? <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading projects…</td></tr> : shown.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No projects found. Create one to get started.</td></tr> : visibleProjects.map((p, index) => <tr key={p.name} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/jh-digitrack/projects/${encodeURIComponent(p.name)}/items`)}><td className="px-3 py-3">{(currentPage - 1) * pageSize + index + 1}</td><td className="px-3 py-3 font-medium">{p.name}</td><td className="px-3 py-3 font-medium">{p.project_name}</td><td className="px-3 py-3"><span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs text-blue-700">{p.status}</span></td><td className="px-3 py-3">{p.due_date || "—"}</td><td className="px-3 py-3">{p.created_by || p.owner || "—"}</td><td className="px-3 py-2 text-center"><div className="flex justify-center"><Button variant="ghost" size="icon" aria-label={`Edit ${p.project_name}`} onClick={(event) => { event.stopPropagation(); beginEdit(p); }}><FileEdit className="h-4 w-4"/></Button>{p.owner === currentUser && !itemsLoading && !itemsError && !projectsWithItems.has(p.name) && <Button variant="ghost" size="icon" aria-label={`Delete ${p.project_name}`} onClick={(event) => { event.stopPropagation(); setDeleteTarget(p); }}><Trash2 className="h-4 w-4"/></Button>}</div></td></tr>)}</tbody>
      {shown.length > 0 && <tfoot><tr><td colSpan={7} className="border-t"><PaginationControls tasksPerPage={pageSize} setTasksPerPage={(size) => { setPageSize(size); setCurrentPage(1); }} totalPages={totalPages} currentPage={currentPage} setCurrentPage={setCurrentPage}/></td></tr></tfoot>}
    </table></div>

    <Sheet open={modal} onOpenChange={setModal}>
      <SheetContent className="px-5 sm:max-w-5xl">
        <SheetHeader className="flex-row items-center justify-between px-0">
          <SheetTitle className="max-w-[100ch] truncate text-2xl font-semibold">
            {editing ? `Edit Project: ${editing.name}` : "Create Project"}
          </SheetTitle>
          <SheetClose asChild><Button variant="ghost" size="icon" aria-label="Close"><X className="size-4"/></Button></SheetClose>
        </SheetHeader>
        <form onSubmit={save} className="relative">
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="space-y-6 py-5 pb-28 pr-4">
              <p className="text-sm text-muted-foreground">{editing?.name ?? "Project ID will be generated when saved."}</p>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="project-name">Project Name</Label><Input id="project-name" required value={form.project_name} onChange={(e) => setForm({...form, project_name:e.target.value})}/></div>
                <div className="space-y-2"><Label htmlFor="business-unit">Business</Label><SearchableSelect id="business-unit" options={businesses.map((business) => ({ value: business.name, label: business.business_name || business.name }))} value={form.business_unit} onChange={(value) => setForm({...form, business_unit:value})} placeholder="Select business"/></div>
                <div className="space-y-2"><Label htmlFor="project-start-date">Start Date</Label><input id="project-start-date" type="date" className={taskDateClass} value={form.start_date} onChange={(e) => setForm({...form, start_date:e.target.value})}/></div>
                <div className="space-y-2"><Label htmlFor="project-due-date">Due Date</Label><input id="project-due-date" type="date" className={taskDateClass} value={form.due_date} onChange={(e) => setForm({...form, due_date:e.target.value})}/></div>
                <div className="space-y-2"><Label htmlFor="project-update-interval">Update Email Interval (Days)</Label><Input id="project-update-interval" type="number" min={0} max={365} step={1} value={form.update_email_interval_days} onChange={(e) => setForm({...form, update_email_interval_days: e.target.value === "" ? 0 : Number(e.target.value)})}/></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="project-description">Project Description</Label><Textarea id="project-description" rows={5} value={form.project_description} onChange={(e) => setForm({...form, project_description:e.target.value})}/></div>
                <div className="space-y-2"><Label htmlFor="project-status">Status</Label><SearchableSelect id="project-status" options={STATUS.map((status) => ({ value: status, label: status }))} value={form.status} onChange={(value) => setForm({...form, status:value as Project["status"]})} placeholder="Select project status"/></div>
                <div className="space-y-2"><Label htmlFor="project-participants">Participant List</Label><MultiSelectCombobox options={visibleParticipantOptions} selectedOptions={participantOptions} selected={participantIds} onChange={setParticipantIds} onSearch={setParticipantSearch} searchKeyword={participantSearch} placeholder="Select participants" emptyMessage="No employees found."/></div>
              </div>
              {editing && <ProjectTimeline projectId={editing.name} createdBy={editing.created_by || editing.owner} createdAt={editing.created_at || editing.creation} />}
            </div>
          </ScrollArea>
          <SheetFooter className="absolute bottom-0 w-full flex-col bg-white">
            <Separator className="my-4"/>
            <div className="flex w-full">
              <SheetClose asChild><Button variant="outline" type="button" className="mr-2 w-full">Cancel</Button></SheetClose>
              <Button type="submit" disabled={saving} className="w-full bg-[#972e26] hover:bg-[#972e26]/90">{saving ? "Saving…" : editing ? "Update Project" : "Create Project"}</Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>

    <DeleteConfirmation open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} taskName={deleteTarget?.project_name} itemLabel="project" onConfirm={confirmDelete}/>
  </section>;
}

export default Projects;
