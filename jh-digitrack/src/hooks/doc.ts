/* eslint-disable @typescript-eslint/no-explicit-any */
import { DocResponse } from "@/types/doc";
import { WithoutArray } from "@/types/without-array";
import frappe from "@/utils/frappe-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Filter, FrappeDoc, GetDocListArgs } from "frappe-js-sdk/lib/db/types";

export type DocFilters<T> = Array<Filter<FrappeDoc<T>>>;

/**
 * Fetches a list of documents.
 * @param args - The arguments to pass to the query.
 * @returns The query object.
 */
export function useDocs<T>(args: {
  doctype: string;
  name?: string;
  filters?: DocFilters<T>;
  /** Note: use either '*' or specify the fields:
   * When using nested fields, use dot notation.
   * e.g. ['name', 'task_name', 'project.name']
   * if using nested fields, keep the orderBy field as '`requiredDoctype`.modified' unless an unambiguous error is thrown.
   */
  fields?: GetDocListArgs<T>["fields"];
  orderBy?: GetDocListArgs<T>["orderBy"];
  limit?: number;
  page?: number;
  enabled?: boolean;
}) {
  const { enabled = true } = args;
  return useQuery({
    queryKey: ["Docs", args],
    queryFn: () => {
      return frappe.db.getDocList<WithoutArray<T>>(args.doctype, {
        // TODO: fields should be array of keys from T
        fields: args.fields ?? ["*"],
        filters: [
          ...((args.name ? [["name", "like", `%${args.name}%`]] : []) as Filter<
            FrappeDoc<T>
          >[]),
          ...(args.filters ?? []),
        ],
        orderBy: args.orderBy ?? {
          field: "modified",
          order: "desc",
        },
        limit: args.limit ?? 10,
        limit_start: args.page ? (args.page - 1) * (args.limit ?? 10) : 0,
      });
    },
    initialData: [],
    enabled,
  });
}

export function useDoc<T>(args: {
  doctype: string;
  name: string;
  disabled?: boolean;
}) {
  return useQuery<T>({
    queryKey: ["Doc", args],
    queryFn: () => frappe.db.getDoc(args.doctype, args.name),
    enabled: !args.disabled,
  });
}

export function useDocDetail<T>(args: {
  doctype: string;
  name: string;
  disabled?: boolean;
}) {
  return useQuery<DocResponse<T>>({
    queryKey: ["DocInfo", args],
    queryFn: () =>
      frappe.api.get(`frappe.desk.form.load.getdoc`, {
        doctype: args.doctype,
        name: args.name,
      }),
    enabled: !args.disabled,
  });
}

export function useDocTypeMeta(doctype: string) {
  return useQuery<any>({
    queryKey: ["DocTypeMeta", doctype],
    queryFn: async () => {
      return frappe.api
        .get("jh_digitrack.api.doctype.meta", {
          doctype,
        })
        .then((response) => response.message);
    },
  });
}

export function useSaveDoc() {
  return useMutation({
    mutationKey: ["SaveDoc"],
    mutationFn: async (doc: any) => {
      return frappe.api
        .post("frappe.desk.form.save.savedocs", {
          doc: JSON.stringify(doc),
          action: "Save",
        })
        .then((response) => response.docs.pop());
    },
  });
}

export function useSubmitDoc() {
  return useMutation({
    mutationKey: ["SubmitDoc"],
    mutationFn: async (doc: any) => {
      return frappe.api
        .post("frappe.desk.form.save.savedocs", {
          doc: JSON.stringify(doc),
          action: "Submit",
        })
        .then((response) => response.docs.pop());
    },
  });
}

export const useCancelDoc = () => {
  return useMutation({
    mutationKey: ["CancelDoc"],
    mutationFn: async (doc: any) => {
      return frappe.api.post("frappe.desk.form.save.savedocs", {
        doc: JSON.stringify(doc),
        action: "Cancel",
      });
    },
  });
};

export const useDeleteDoc = () => {
  return useMutation({
    mutationKey: ["DeleteDoc"],
    mutationFn: async (args: { doctype: string; name: string }) => {
      return frappe.api.post("frappe.client.delete", args);
    },
  });
};

export const useUpdateDoc = () => {
  return useMutation({
    mutationKey: ["UpdateDoc"],
    mutationFn: async (args: { doctype: string; name: string; doc: any }) => {
      const { doctype, name, doc } = args;
      return frappe.db.updateDoc(doctype, name, doc);
    },
  });
};

export const useAddComment = () => {
  return useMutation({
    mutationKey: ["AddComment"],
    mutationFn: async (args: {
      reference_doctype: string;
      reference_name: string;
      content: string;
      comment_email?: string;
      comment_by?: string;
    }) => {
      const {
        reference_doctype,
        reference_name,
        content,
        comment_email,
        comment_by,
      } = args;

      return frappe.api.post("frappe.desk.form.utils.add_comment", {
        reference_doctype,
        reference_name,
        content,
        comment_email,
        comment_by,
      });
    },
  });
};
