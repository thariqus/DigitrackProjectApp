
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/utils/query-client";
import { Toaster } from "@/components/toaster";
import { Navigate, Route, Routes, BrowserRouter } from "react-router";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { lazy, Suspense, useEffect, useRef } from "react";
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
import JRCPermission from "./components/jrc-permission";
import Properties from "./components/PropertyAutomation/Properties";
import Renewals from "./components/PropertyAutomation/Renewals";
import PropertyAutomationDashboard from "./components/PropertyAutomation/PropertyAutomationDashboard";
const PropertyAutomation = lazy(()=> import("./components/PropertyAutomation"));

function AppWrapper() {

  const IDLE_TIME = 15 * 60 * 1000; 
  const logoutTimer = useRef<NodeJS.Timeout | null>(null);

  const resetIdleTimer = () => {
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    logoutTimer.current = setTimeout(globalLogout, IDLE_TIME);

    localStorage.setItem("global_user_activity", Date.now().toString());
  };

  const globalLogout = () => {
    window.location.href =
      "/api/method/jh_digitrack.api.idle_logout.idle_logout";
  };

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((evt) => window.addEventListener(evt, resetIdleTimer));

    const storageListener = (event: StorageEvent) => {
      if (event.key === "global_user_activity") {
        if (logoutTimer.current) clearTimeout(logoutTimer.current);
        logoutTimer.current = setTimeout(globalLogout, IDLE_TIME);
      }
    };
    window.addEventListener("storage", storageListener);

    resetIdleTimer();

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, resetIdleTimer));
      window.removeEventListener("storage", storageListener);
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
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
              <Route path="idle-assets" element={<Scrapitems />} />
              <Route path="jrc-permission" element={<JRCPermission />} />
              <Route path="property" element={<PropertyAutomation />} >
                 <Route index element={<Navigate to="dashboard" replace />} />  
                 <Route path="dashboard" element={<PropertyAutomationDashboard/>} />
                 <Route path="properties" element={<Properties />} />
                 <Route path="renewals" element={<Renewals/>} />
              </Route>
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
