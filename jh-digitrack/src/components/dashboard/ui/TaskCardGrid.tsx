import React, { useEffect, useState } from "react";
import { TaskCard } from "./TaskCard";
import { getTaskStatusCounts } from "@/hooks/task_status_count";
import { AuditCard } from "./AuditCard";
import { TravelRequestCard } from "./TravelRequestCard";
import { MeetingCard } from "./MeetingCard";
import { ProjectCard } from "./ProjectCard";
const initialCounts = {
  meetings: {open: 0},
  projects: {open: 0},
  audits: {open: 0},
  travel_request: {approval_pending: 0, urgent: 0, reconfirmation_pending: 0,},
  my_tasks: { open: 0, in_progress: 0},
  created_by_me: { open: 0, in_progress: 0 },
};

export const TaskCardGrid = () => {
  const [counts, setCounts] = useState(initialCounts);

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

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TaskCard title="My Tasks" filterKey="my-tasks" counts={counts.my_tasks} />
        <TaskCard title="Created By Me" filterKey="created-by-me" counts={counts.created_by_me} />
        <TravelRequestCard title="Travel Requests" filterKey="dashboard" counts={counts.travel_request} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <AuditCard title="Audits" filterKey="dashboard" count={counts.audits?.open || 0} />
        <MeetingCard title="Meetings" filterKey="dashboard" count={counts.meetings?.open || 0} />
        <ProjectCard title="Projects" filterKey="dashboard" count={counts.projects?.open || 0} />
      </div>
    </>
  );
};
