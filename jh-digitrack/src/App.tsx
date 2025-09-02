import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/utils/query-client";
import { Toaster } from "@/components/toaster";
import { Navigate, Route, Routes, BrowserRouter } from "react-router";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Suspense } from "react";
import AuthProvider from "@/components/auth";
import SplashScreen from "@/components/splash-screen";
import Layout from "@/components/layout";
import Tasks from "@/components/tasks";
import Projects from "@/components/projects";
import Meetings from "@/components/meetings";
import Unauthorized from "./components/Unauthorized";
import Audits from "./components/audits";
import Search from "./components/search";
// import RecycleBin from "./components/recycle-bin";
import AuditTasks from "./components/tasks/task-table/audit-tasks";
import MeetingTasks from "./components/tasks/task-table/meeting-tasks";
import MeetingTasksExpanded from "./components/tasks/task-table/meeting-tasks-expanded";
import MeetingTasksShrink from "./components/tasks/task-table/meeting-tasks-shrink";
import AuditTasksExpanded from "./components/tasks/task-table/audit-tasks-expanded";
import AuditTasksShrink from "./components/tasks/task-table/audit-tasks-shrink";
import Maintenance from "./components/Maintenance";
import Dashboard from "./components/dashboard"; 

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/maintenance" element={<Maintenance />} />
        </Routes>
        <AuthProvider>
          <Suspense fallback={<SplashScreen />}>
            <Routes>
              <Route
                path="/"
                element={<Navigate to="/jh-digitrack/dashboard" replace />}
              />
              <Route path="/jh-digitrack" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="projects" element={<Projects />} />
                <Route path="meetings" element={<Meetings />} />
                <Route path="meetings/:meetingId" element={<MeetingTasks />} />
                <Route
                  path="meetings/:meetingId/expanded"
                  element={<MeetingTasksExpanded />}
                />
                <Route path="meetings/:meetingId/shrink" element={<MeetingTasksShrink />} />
                <Route path="audits" element={<Audits />} />
                <Route path="audits/:auditId" element={<AuditTasks />} />
                <Route
                  path="audits/:auditId/expanded"
                  element={<AuditTasksExpanded />}
                />
                <Route path="audits/:auditId/shrink" element={<AuditTasksShrink />} />

                <Route path="search" element={<Search />} />
                {/* <Route path="recycle-bin" element={<RecycleBin />} /> */}
              </Route>
              <Route
                path="*"
                element={<Navigate to="/jh-digitrack/dashboard" replace />}
              />
            </Routes>
          </Suspense>
          <Toaster position="top-right" closeButton />
        </AuthProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
