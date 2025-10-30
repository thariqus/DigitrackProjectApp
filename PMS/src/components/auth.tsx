import { PropsWithChildren } from "react";
import { useLoggedInUser, useCurrentJhUser } from "../hooks/auth";
import { useUser } from "../hooks/user";
import { AuthContext } from "./AuthContext";
import { Navigate } from "react-router";
import { useMaintenanceMode } from "@/hooks/system";

function AuthProvider(props: PropsWithChildren) {
  const { data: userId, isLoading } = useLoggedInUser();
  const { data: currentJHUser, isLoading: jhUserLoading } = useCurrentJhUser();
  const { data: user, isLoading: userLoading } = useUser(userId);
  const { data: maintenanceMode, isLoading: maintenanceModeLoading } =
    useMaintenanceMode();

  if (isLoading || jhUserLoading || userLoading || maintenanceModeLoading) {
    return null;
  }

  if (!user) {
    window.location.href = "/login";
    return;
  }

  if (!currentJHUser?.name) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (maintenanceMode?.message?.maintenance_mode) {
    return <Navigate to="/maintenance" replace />;
  }

  return <AuthContext.Provider value={user} {...props} />;
}

export default AuthProvider;
