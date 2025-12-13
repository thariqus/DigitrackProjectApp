import { Navigate } from "react-router";
import { useCurrentPmsEmployee } from "@/hooks/auth";

export default function DashboardRedirect() {
  const { data: employee, isLoading } = useCurrentPmsEmployee();

  if (isLoading) return null;

  if (employee?.pms_admin) {
    return <Navigate to="/reports" state={{ fromAdmin: true }} replace />;
  }

  if (employee?.pms_manager) {
    return <Navigate to="/reports" state={{ fromAdmin: false }} replace />;
  }

  if (employee?.pms_employee || employee?.self_assessment) {
    return <Navigate to="/self-evaluation" replace />;
  }

  return <Navigate to="/login" replace />;
}
