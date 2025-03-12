import { createContext, PropsWithChildren, ReactNode } from "react";
import { useLoggedInUser } from "../hooks/auth";
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
  const { data: user } = useUser(userId);

  if (isLoading) {
    return null;
  }

  if (!isLoading && !userId) {
    window.open(`${window.location.origin}/login`, "_self");
    return null;
  }

  if (!user) {
    return null;
  }

  return <AuthContext.Provider value={user} {...props} />;
}

export default AuthProvider;
