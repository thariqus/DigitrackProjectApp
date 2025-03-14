import { useMutation, useQuery } from "@tanstack/react-query";
import frappe from "@/utils/frappe-client";
import { JHUserMaster } from "@/types/JHDigitrack/JHUserMaster";

/**
 * Get logged in User's Name: Used for checking login status
 * @returns string
 */
export const useLoggedInUser = () => {
  return useQuery({
    queryKey: ["logged-in-user"],
    queryFn: () => frappe.auth.getLoggedInUser(),
  });
};

/**
 * Get logged in User's Name: Used for getting current user name
 * @returns string
 * stale for 1 hour
 */
export const useCurrentUser = () => {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: () => frappe.auth.getLoggedInUser(),
    staleTime: 1000 * 60 * 60,
  });
};

export const useCurrentJhUser = () => {
  return useQuery({
    queryKey: ["current-jh-user"],
    queryFn: async () =>
      frappe.db.getLastDoc<JHUserMaster>("JH User Master", {
        filters: [["user", "=", await frappe.auth.getLoggedInUser()]],
      }),
    staleTime: 1000 * 60 * 60,
  });
};

/**
 * Hook for logging out the current user
 * @returns mutation function to trigger logout
 */
export const useLogout = () => {
  return useMutation({
    mutationFn: async () => {
      await frappe.auth.logout();
      // Redirect to login page after successful logout
      window.location.href = "/login";
    },
  });
};
