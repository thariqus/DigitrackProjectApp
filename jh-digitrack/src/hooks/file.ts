import { useMutation } from "@tanstack/react-query";
import frappe from "@/utils/frappe-client";
import { toast } from "sonner";

type Props = {
  files: File[];
  onProgress: (progress: number) => void;
  onComplete: (status: boolean) => void;
  onError: (error: Error) => void;
  isPrivate?: 1 | 0;
  folder?: string;
  doctype: string;
  docname: string;
  fieldname?: string;
};

export const useFilesUpload = () => {
  return useMutation({
    mutationKey: ["FilesUpload"],
    mutationFn: async ({
      files,
      docname,
      doctype,
      isPrivate,
      fieldname,
      folder,
      onComplete,
      onError,
      onProgress,
    }: Props) => {
      const failed: {
        index: number;
        status: boolean;
      }[] = [];

      const file = frappe.file;

      for (const [index, fileObj] of files.entries()) {
        try {
          await file.uploadFile(
            fileObj,
            {
              isPrivate: isPrivate === 1,
              folder: folder || "Home",
              doctype,
              docname,
              fieldname,
            },
            (completedBytes, totalBytes) => {
              const fileProgress = Math.round(
                (completedBytes / (totalBytes ?? 1)) * 100
              );
              const totalProgress =
                ((index + fileProgress / 100) / files.length) * 100;
              onProgress(totalProgress);
            }
          );
        } catch (error) {
          onError(error);
          toast.error(error.message);
          failed.push({ index, status: false });
        }
      }

      onComplete(failed.length === 0);
    },
  });
};

export const useFileRemove = () => {
  return useMutation({
    mutationKey: ["FileRemove"],
    mutationFn: async (args: { fid: string; dt: string; dn: string }) => {
      return frappe.api.delete("frappe.desk.form.utils.remove_attach", args);
    },
  });
};
