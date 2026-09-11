import { useMutation } from "@tanstack/react-query";
import frappe from "@/utils/frappe-client";
import { toast } from "sonner";
 
type Props = {
  files: File[];
  employeeCode: string;
  year: string;
  onProgress: (progress: number) => void;
  onComplete: (status: boolean) => void;
  onError: (error: Error) => void;
  onFileUploaded?: (fileUrl: string) => void;
  isPrivate?: 1 | 0;
  folder?: string;
  doctype: string;
  docname?: string;
  fieldname?: string;
};
 
const ALLOWED_FILE_TYPES = [
  "pdf", "docx", "xlsx", "jpg", "jpeg", "png", "csv", "svg"
];
 
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
      onFileUploaded,
    }: Props) => {
      const failed: { index: number; status: boolean }[] = [];
 
      if (!employeeCode || !year) {
        throw new Error("Missing employee code or year for file upload.");
      }
 
      const file = frappe.file;
      const targetDocname = docname || `${employeeCode}-${year}`;
 
      for (const [index, fileObj] of files.entries()) {
        try {
          if (fileObj.size > 2 * 1024 * 1024) {
            throw new Error(`File "${fileObj.name}" exceeds 2MB limit.`);
          }
 
          const extension = fileObj.name.split(".").pop()?.toLowerCase();
          if (!extension || !["pdf", "docx", "xlsx", "jpg", "jpeg", "png", "csv", "svg"].includes(extension)) {
            throw new Error("The attached file type is not allowed.");
          }
 
          const response = await file.uploadFile(
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
 
          const fileUrl = response?.data?.message?.file_url;
          if (fileUrl) {
            onFileUploaded?.(fileUrl);
          }
        } catch (error: any) {
          console.log("UPLOAD ERROR:", error);
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
 
 