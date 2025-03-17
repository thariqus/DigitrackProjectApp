import { PropsWithChildren } from "react";
import { useLoggedInUser, useCurrentJhUser } from "../hooks/auth";
import { useUser } from "../hooks/user";
import { AuthContext } from "./AuthContext";
import { Navigate } from "react-router";

function AuthProvider(props: PropsWithChildren) {
  const { data: userId, isLoading } = useLoggedInUser();
  const { data: currentJHUser } = useCurrentJhUser();
  const { data: user, isLoading: jhUserLoading } = useUser(userId);

  if (isLoading || jhUserLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isLoading && !jhUserLoading && !currentJHUser?.name) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <AuthContext.Provider value={user} {...props} />;
}

export default AuthProvider;
