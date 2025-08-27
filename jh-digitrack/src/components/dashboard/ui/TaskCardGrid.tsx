import React, { useEffect, useState } from "react";
import { TaskCard } from "./TaskCard";
import { getTaskStatusCounts } from "@/hooks/task_status_count";
import { AuditCard } from "./AuditCard";
import { TravelRequestCard } from "./TravelRequestCard";
import { MeetingCard } from "./MeetingCard";
import { ProjectCard } from "./ProjectCard";

const initialCounts = {
  meetings: { open: 0 },
  projects: { open: 0 },
  audits: { open: 0 },
  travel_request: {
    approval_pending: 0,
    urgent: 0,
    reconfirmation_pending: 0,
  },
  my_tasks: {
    Open: { count: 0, ages: [] },
    In_Progress: { count: 0, ages: [] },
    completed: { count: 0 },
    canceled: { count: 0 },
  },
  created_by_me: {
    Open: { count: 0, ages: [] },
    In_Progress: { count: 0, ages: [] },
    completed: { count: 0 },
    canceled: { count: 0 },
  },
  team_tasks: {
    Open: { count: 0, ages: [] },
    In_Progress: { count: 0, ages: [] },
  },
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <TaskCard title="My Tasks" filterKey="my-tasks" counts={counts.my_tasks}/>
      
      <TaskCard title="Created By Me" filterKey="created-by-me" counts={counts.created_by_me}/>
      
      <div className="flex flex-col gap-4">
        <TravelRequestCard title="Travel Requests" filterKey="dashboard" counts={counts.travel_request}/>
        
        <div className="grid grid-cols-3 gap-4">
          <MeetingCard title="Meetings" filterKey="dashboard" count={counts.meetings?.open || 0} />
          <AuditCard title="Audits" filterKey="dashboard" count={counts.audits?.open || 0} />
          <ProjectCard title="Projects" filterKey="dashboard" count={counts.projects?.open || 0} />
        </div>
      </div>
          <div className="md:col-span-2 bg-rose-100 rounded-xl shadow p-3 mt-[-12px]">
      <p className="text-sm text-black-700 text-center font-bold">
        Tasks in Completed / Closed status need your review, make them Closed or Re-open (if further action is required).
      </p>
    </div>
    </div>
  );
};
