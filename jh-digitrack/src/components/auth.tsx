import { PropsWithChildren } from "react";
import { useLoggedInUser, useCurrentJhUser } from "../hooks/auth";
import { useUser } from "../hooks/user";
import { AuthContext } from "./AuthContext";
import { Navigate } from "react-router";

function AuthProvider(props: PropsWithChildren) {
  const { data: userId, isLoading } = useLoggedInUser();
  const { data: currentJHUser, isLoading: jhUserLoading } = useCurrentJhUser();
  const { data: user, isLoading: userLoading } = useUser(userId);

  if (isLoading || jhUserLoading || userLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!currentJHUser?.name) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <AuthContext.Provider value={user} {...props} />;
}

export default AuthProvider;
