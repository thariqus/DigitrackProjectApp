import { createContext } from "react";

type User = {
  name: string;
  email: string;
  full_name?: string;
  language?: string;
  username?: string;
};

export const AuthContext = createContext<User | null>(null);
