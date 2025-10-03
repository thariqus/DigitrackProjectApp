
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/utils/query-client";
import { Toaster } from "@/components/toaster";
import { Navigate, Route, Routes, BrowserRouter } from "react-router";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Suspense, useEffect, useRef } from "react";
import AuthProvider from "@/components/auth";
import SplashScreen from "@/components/splash-screen";
import Layout from "@/components/layout";
import Tasks from "@/components/tasks";
import Projects from "@/components/projects";
import Meetings from "@/components/meetings";
import Scrapitems from "@/components/scrapitem";
import Unauthorized from "./components/Unauthorized";
import Audits from "./components/audits";
import Search from "./components/search";
import AuditTasks from "./components/tasks/task-table/audit-tasks";
import MeetingTasks from "./components/tasks/task-table/meeting-tasks";
import MeetingTasksExpanded from "./components/tasks/task-table/meeting-tasks-expanded";
import MeetingTasksShrink from "./components/tasks/task-table/meeting-tasks-shrink";
import AuditTasksExpanded from "./components/tasks/task-table/audit-tasks-expanded";
import AuditTasksShrink from "./components/tasks/task-table/audit-tasks-shrink";
import Maintenance from "./components/Maintenance";
import Dashboard from "./components/dashboard";

function AppWrapper() {
  const idleTimer = useRef<NodeJS.Timeout | null>(null);
  const IDLE_TIME = 10 * 60 * 1000; 
  const resetIdleTimer = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);

    idleTimer.current = setTimeout(() => {
      window.location.href = "/api/method/jh_digitrack.api.idle_logout.idle_logout";
    }, IDLE_TIME);
  };


  useEffect(() => {

    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetIdleTimer));

    resetIdleTimer();

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetIdleTimer));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<SplashScreen />}>
          <Routes>
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/maintenance" element={<Maintenance />} />

            <Route path="/" element={<Navigate to="/jh-digitrack/dashboard" replace />} />
            <Route path="/jh-digitrack" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="projects" element={<Projects />} />
              <Route path="scrapitems" element={<Scrapitems />} />
              <Route path="meetings" element={<Meetings />} />
              <Route path="meetings/:meetingId" element={<MeetingTasks />} />
              <Route path="meetings/:meetingId/expanded" element={<MeetingTasksExpanded />} />
              <Route path="meetings/:meetingId/shrink" element={<MeetingTasksShrink />} />
              <Route path="audits" element={<Audits />} />
              <Route path="audits/:auditId" element={<AuditTasks />} />
              <Route path="audits/:auditId/expanded" element={<AuditTasksExpanded />} />
              <Route path="audits/:auditId/shrink" element={<AuditTasksShrink />} />
              <Route path="search" element={<Search />} />
            </Route>
            <Route path="*" element={<Navigate to="/jh-digitrack/dashboard" replace />} />
          </Routes>
        </Suspense>
        <Toaster position="top-right" closeButton />
      </AuthProvider>
    </BrowserRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppWrapper />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
