import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "@/utils/query-client";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { Suspense, useEffect, useRef } from "react";

import { ScrollToTop } from "./components/common/ScrollToTop";
import AppLayout from "./layout/AppLayout";

import Login from "./pages/Loginanother";
import Home from "./pages/Dashboard/Home";
import GoalList from "./pages/pages/GoalList";
import GoalAssignment from "./pages/pages/GoalAssignment";
import GoalMaster from "./pages/GoalMaster";
import GoalCreation from "./pages/GoalCreation";
import GoalEvaluation from "./pages/pages/GoalEvaluation";
import EmployeeGoalEvaluation from "./pages/pages/EmployeeGoalevalustion";
import CreatedByMe from "./pages/pages/CreateByMe";
import EvaluationAssessmentSetUp from "./pages/EvaluationAssessmantSetUp";
import AssignEmployee from "./pages/AssignEmployee";
import MyEvaluationList from "./pages/MyEvaluationList";
import CategoryPage from "./pages/CategoryPage";
import CategoryMaster from "./pages/pages/CategoryMaster";
import AssessmentSummaryReport from "./pages/AssessmentSummaryReport";
import AssessmentDetailReport from "./pages/AssessmentDetailReport";
import AssessmentGoalWiseReport from "./pages/AssessmentGoalWiseReport";
import EvaluationActivationList from "./pages/EvaluationActivationList";
import Evaluation from "./pages/Evaluation";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Calendar from "./pages/Calendar";
import Blank from "./pages/Blank";
import FormElements from "./pages/Forms/FormElements";
import BasicTables from "./pages/Tables/BasicTables";
import Alerts from "./pages/UiElements/Alerts";
import Avatars from "./pages/UiElements/Avatars";
import Badges from "./pages/UiElements/Badges";
import Buttons from "./pages/UiElements/Buttons";
import Images from "./pages/UiElements/Images";
import Videos from "./pages/UiElements/Videos";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import AuthProvider from "@/components/auth";
import DashboardRedirect from "@/components/DashboardRedirect"
import Reports from "./pages/pages/Reports";
import SelfEvaluationRedirect from "@/components/SelfEvaluationRedirect"
import SelfEvaluationHistory from "./pages/pages/SelfEvaluationHistory";
import AdminSettings from "./pages/AdminSettings";
import AdminView from "./pages/pages/AdminView";
import ManagerYearlySubmission from "./pages/pages/ManagerYearlySubmission";
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
    <Router basename="/PMS">
      <ScrollToTop />
      <AuthProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route element={<AppLayout />}>
            {/* <Route index element={<Reports />} /> */}
            <Route index element={<Navigate to="/dashboard-redirect" replace />} />
            <Route path="/dashboard-redirect" element={<DashboardRedirect />} />
            <Route path="/self-evaluation" element={<SelfEvaluationRedirect />} />
            <Route path="/self-evaluation-history" element={<SelfEvaluationHistory />} />
            <Route path="/pms" element={<Reports />} />
            <Route path="/goallist" element={<GoalList />} />
            <Route path="/goalassignment" element={<GoalAssignment />} />
            <Route path="/goalmaster" element={<GoalMaster />} />
            <Route path="/goalcreation" element={<GoalCreation />} />
            <Route path="/goalevaluation" element={<GoalEvaluation />} />
            <Route path="/yearlysubmission" element={<ManagerYearlySubmission />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/employeegoalevaluation" element={<EmployeeGoalEvaluation />} />
            <Route path="/Createdbyme" element={<CreatedByMe />} />
            <Route path="/evaluationassessmentsetup" element={<EvaluationAssessmentSetUp />} />
            <Route path="/employeeassignment" element={<AssignEmployee />} />
            <Route path="/myevaluationlist" element={<MyEvaluationList />} />
            <Route path="/category" element={<CategoryPage />} />
            <Route path="/categorymaster" element={<CategoryMaster />} />
            <Route path="/assessmentsummaryreport" element={<AssessmentSummaryReport />} />
            <Route path="/assessmentdetailreport" element={<AssessmentDetailReport />} />
            <Route path="/assessmentgoalwisereport" element={<AssessmentGoalWiseReport />} />
            <Route path="/goalevaluation" element={<Evaluation />} />
            <Route path="/evaluationactivationlist" element={<EvaluationActivationList />} />
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/blank" element={<Blank />} />
            <Route path="/form-elements" element={<FormElements />} />
            <Route path="/basic-tables" element={<BasicTables />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} />
            <Route path="/adminsettings" element={<AdminSettings />} />
            <Route path="/admin-report" element={<AdminView />} />
          </Route>

          {/* Auth */}
          <Route path="/" element={<Login />} />
          <Route path="/loginanother" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </AuthProvider>
    </Router>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppWrapper />
      <Toaster richColors position="top-right" />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}



