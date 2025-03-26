import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/utils/query-client";
import { Toaster } from "@/components/toaster";
import { Navigate, Route, Routes, BrowserRouter } from "react-router";
import { Suspense } from "react";
import AuthProvider from "@/components/auth";
import SplashScreen from "@/components/splash-screen";
import Layout from "@/components/layout";
import Tasks from "@/components/tasks";
import Projects from "@/components/projects";
import Meetings from "@/components/meetings";
import Unauthorized from "./components/Unauthorized";
import RecycleBin from "./components/recycle-bin";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/unauthorized" element={<Unauthorized />} />
        </Routes>
        <AuthProvider>
          <Suspense fallback={<SplashScreen />}>
            <Routes>
              <Route
                path="/"
                element={<Navigate to="/jh-digitrack/tasks" replace />}
              />
              <Route path="/jh-digitrack" element={<Layout />}>
                <Route index element={<Tasks />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="projects" element={<Projects />} />
                <Route path="meetings" element={<Meetings />} />
                <Route path="recycle-bin" element={<RecycleBin />} />
              </Route>
            </Routes>
          </Suspense>
          <Toaster position="top-right" closeButton />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
