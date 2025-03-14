import { createContext, PropsWithChildren } from "react";
import { useLoggedInUser, useCurrentJhUser } from "../hooks/auth";
import { useUser } from "../hooks/user";

type User = {
  name: string;
  email: string;
  full_name?: string;
  language?: string;
  username?: string;
};

export const AuthContext = createContext<User | null>(null);

function AuthProvider(props: PropsWithChildren) {
  const { data: userId, isLoading } = useLoggedInUser();
  const { data: currentJHUser } = useCurrentJhUser();
  const { data: user, isLoading: jhUserLoading } = useUser(userId);

  if (isLoading || jhUserLoading) {
    return null;
  }

  if (!isLoading && !jhUserLoading && !currentJHUser?.name) {
    window.open(`${window.location.origin}/login`, "_self");
    return null;
  }

  if (!user) {
    return null;
  }

  return <AuthContext.Provider value={user} {...props} />;
}

export default AuthProvider;
