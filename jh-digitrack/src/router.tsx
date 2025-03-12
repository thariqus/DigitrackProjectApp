import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import SplashScreen from "@/components/splash-screen";

const Layout = lazy(() => import("@/components/layout"));
const Tasks = lazy(() => import("@/components/tasks"));
const Projects = lazy(() => import("@/components/projects"));
const Meetings = lazy(() => import("@/components/meetings"));

function AppRoutes() {
  return (
    <Suspense fallback={<SplashScreen />}>
      <Routes>
        <Route index element={<Navigate to="/jh-digitrack" />} />
        <Route path="/jh-digitrack" element={<Layout />}>
          <Route index element={<Navigate to="tasks" />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="projects" element={<Projects />} />
          <Route path="meetings" element={<Meetings />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
