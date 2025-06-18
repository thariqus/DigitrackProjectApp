import { useMemo } from "react";
import { DocFilters, useDocs, useDocTypeMeta } from "@/hooks/doc";
import { JHUserMaster } from "@/types/JHDigitrack/JHUserMaster";
import { TaskStatus } from "@/types/tasks";
import { useMutation } from "@tanstack/react-query";
import frappeClient from "@/utils/frappe-client";

export function useUserSearch(searchTerm: string = "") {
  const usersFilters: DocFilters<JHUserMaster> = [
    ["full_name", "!=", "JH Admin"],
    ["full_name", "like", `%${searchTerm}%`],
  ];

  const { data: allUsers = [], isLoading } = useDocs<JHUserMaster>({
    doctype: "JH User Master",
    fields: ["full_name", "name"],
    filters: usersFilters,
    orderBy: {
      field: "full_name",
      order: "asc",
    },
  });

  const filteredUsers = useMemo(() => {
    return allUsers.map((user) => ({
      value: user.name!,
      label: user.full_name!,
    }));
  }, [allUsers, searchTerm]);

  return {
    users: filteredUsers,
    isLoading,
    allUsers,
  };
}

export function useStatusSearch(searchTerm: string = "") {
  const { data: taskMetadata, isLoading } = useDocTypeMeta("JH Task Master");

  const statusField = taskMetadata?.fields?.find(
    (field: { fieldname: string }) => field.fieldname === "status"
  );

  const status = statusField?.options?.split("\n") ?? [];

  const filteredStatus = useMemo(() => {
    return status
      .filter(
        (option: TaskStatus) =>
          !searchTerm ||
          option?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map((option: TaskStatus) => ({
        value: option!,
        label: option!,
      }));
  }, [status, searchTerm]);

  return {
    status: filteredStatus,
    isLoading,
  };
}

export const useGlobalSearch = () => {
  return useMutation({
    mutationFn: (data: {
      reporting_to?: string;
      task_name?: string;
      audit_name?: string;
      meeting_name?: string;
      status?: string;
      assigned_to?: string;
      assigned_by?: string;
      created_date_from?: string;
      created_date_to?: string;
      due_date_from?: string;
      due_date_to?: string;
    }) => frappeClient.api.post(`jh_digitrack.api.search.global_search`, data),
  });
};
