import { useDoc } from "./doc";
import { User } from "../types/Core/User";

export const useUser = (name?: string) => {
  return useDoc<User>({
    doctype: "User",
    name: name ?? "",
    disabled: !name,
  });
};
