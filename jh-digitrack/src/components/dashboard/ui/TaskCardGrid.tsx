import { useEffect, useState } from "react";
import { ListTodo } from "lucide-react";
import { TaskCard } from "./TaskCard";
import { getTaskStatusCounts } from "@/hooks/task_status_count";
import { TravelRequestCard } from "./TravelRequestCard";
import { MeetingCard } from "./MeetingCard";
import { AuditCard } from "./AuditCard";
import { ProjectCard } from "./ProjectCard";
import { PropertyAutomationCard } from "./PropertyAutomationCard";
import { usePropertyDashboardCounts } from "@/components/PropertyAutomation/hooks/useProperty";

const initialCounts = {
  travel_request: {} as Record<string, number>,
  my_tasks: {} as Record<string, { count: number; ages?: { label: string; count: number }[] }>,
  created_by_me: {} as Record<string, { count: number; ages?: { label: string; count: number }[] }>,
  audits: {} as Record<string, number>,
  meetings: {} as Record<string, number>,
};

export const TaskCardGrid = () => {
  const [counts, setCounts] = useState(initialCounts);
  const { data: propCounts, isError: propError } = usePropertyDashboardCounts();

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const sessionRes = await fetch("/api/method/frappe.auth.get_logged_user", {
          credentials: "include",
        });
        const sessionUser = (await sessionRes.json()).message;

        const userRes = await fetch(`/api/resource/User/${sessionUser}`, {
          credentials: "include",
        });
        const email = (await userRes.json()).data.email;

        const jhUserRes = await fetch(
          `/api/resource/JH User Master?fields=["name"]&filters=[["email", "=", "${email}"]]`,
          { credentials: "include" }
        );
        const jhUserData = await jhUserRes.json();
        const jhUserName = jhUserData.data?.[0]?.name;

        if (!jhUserName) return;

        const data = await getTaskStatusCounts(jhUserName);
        setCounts(data);
      } catch (err) {
        console.error("Failed to fetch task status counts", err);
      }
    };

    fetchCounts();
  }, []);

  const taskTotal = (c: Record<string, { count: number }>) =>
    Object.values(c).reduce((s, v) => s + (v?.count || 0), 0);

  const travelTotal = (c: Record<string, number>) =>
    Object.values(c).reduce((s, v) => s + (v || 0), 0);

  const propTotal = propError
    ? 0
    : (["active_properties", "renewals_30_days", "renewals_90_days", "overdue"] as const).reduce(
        (s, k) => s + (propCounts?.[k] ?? 0),
        0
      );

  const allCards = [
    {
      key: "my-tasks",
      total: taskTotal(counts.my_tasks),
      node: <TaskCard key="my-tasks" title="My Tasks" filterKey="my-tasks" counts={counts.my_tasks} icon={ListTodo} />,
    },
    {
      key: "created-by-me",
      total: taskTotal(counts.created_by_me),
      node: <TaskCard key="created-by-me" title="Created By Me" filterKey="created-by-me" counts={counts.created_by_me} icon={ListTodo} />,
    },
    {
      key: "travel",
      total: travelTotal(counts.travel_request),
      node: <TravelRequestCard key="travel" title="Travel Requests" filterKey="dashboard" counts={counts.travel_request} />,
    },
    {
      key: "meetings",
      total: counts.meetings?.open ?? 0,
      node: <MeetingCard key="meetings" title="Meetings" filterKey="dashboard" count={counts.meetings?.open ?? 0} />,
    },
    {
      key: "audits",
      total: counts.audits?.open ?? 0,
      node: <AuditCard key="audits" title="Audits" filterKey="dashboard" count={counts.audits?.open ?? 0} />,
    },
    {
      key: "projects",
      total: 0,
      node: <ProjectCard key="projects" title="Projects" filterKey="dashboard" />,
    },
    ...(!propError ? [{
      key: "property",
      total: propTotal,
      node: <PropertyAutomationCard key="property" />,
    }] : []),
  ].sort((a, b) => b.total - a.total);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-7 gap-y-4">
        {allCards.map((c) => c.node)}
      </div>

      <div className="bg-rose-100 rounded-xl shadow p-3">
        <p className="text-sm text-center font-bold">
          *Created By Me: Tasks in Completed / Cancelled status need your review, make them Closed or Re-open (if further action is required).
        </p>
      </div>
    </div>
  );
};
