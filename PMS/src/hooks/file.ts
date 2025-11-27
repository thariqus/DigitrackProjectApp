import { useMutation } from "@tanstack/react-query";
import frappe from "@/utils/frappe-client";
import { toast } from "sonner";

type Props = {
  files: File[];
  employeeCode: string; // new
  year: string;         // new
  onProgress: (progress: number) => void;
  onComplete: (status: boolean) => void;
  onError: (error: Error) => void;
  isPrivate?: 1 | 0;
  folder?: string;
  doctype: string;
  docname?: string;     // optional, auto-generated if missing
  fieldname?: string;
};

export const useFilesUpload = () => {
  return useMutation({
    mutationKey: ["FilesUpload"],
    mutationFn: async ({
      files,
      employeeCode,
      year,
      doctype,
      docname,
      fieldname,
      isPrivate,
      folder,
      onComplete,
      onError,
      onProgress,
    }: Props) => {
      const failed: { index: number; status: boolean }[] = [];

      if (!employeeCode || !year) {
        throw new Error("Missing employee code or year for file upload.");
      }

      const file = frappe.file;

      // auto-generate docname if not provided
      const targetDocname = docname || `${employeeCode}-${year}`;

      for (const [index, fileObj] of files.entries()) {
        try {
          // Check file size <= 2MB
          if (fileObj.size > 2 * 1024 * 1024) {
            throw new Error(`File "${fileObj.name}" exceeds 2MB limit.`);
          }

          await file.uploadFile(
            fileObj,
            {
              isPrivate: isPrivate === 1,
              folder: folder || "Home",
              doctype,
              docname: targetDocname,
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
        } catch (error: any) {
          onError(error);
          toast.error(error.message || "File upload failed.");
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
      if (!args.fid || !args.dt || !args.dn) {
        throw new Error("Missing parameters to delete attachment.");
      }
      return frappe.api.delete("frappe.desk.form.utils.remove_attach", args);
    },
  });
};




