import type React from "react";
import { useState, useCallback } from "react";

import { Cloud, File, X } from "lucide-react";
import "react-quill/dist/quill.snow.css";
import "./quill.css";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/types/doc";

// Maximum file size in bytes (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;

/**
 * File attachment handler component
 * Handles file uploads, validation, and display
 */
interface FileAttachmentHandlerProps {
  existingFiles: Attachment[];
  disabled?: boolean;
  onFilesChange: (files: File[]) => void;
  onExistingFileRemove: (file: Attachment) => Promise<void>;
  getAttachmentOwner?: (fileName: string) => string | undefined;
  currentUser?: string;
  taskOwner?: string;
  allowedExtensions?: string[];
}

function FileAttachmentHandler({
  existingFiles,
  disabled = false,
  onFilesChange,
  onExistingFileRemove,
  getAttachmentOwner,
  currentUser,
  taskOwner,
  allowedExtensions,
}: FileAttachmentHandlerProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  /**
   * Validates a single file against size limits
   * @param file File to validate
   * @returns True if file is valid
   */
  const validateFile = useCallback((file: File): boolean => {
    if (allowedExtensions?.length) {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      if (!allowedExtensions.includes(extension)) {
        toast.error(`File ${file.name} is not an allowed type`);
        return false;
      }
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File ${file.name} exceeds the maximum file size of 10MB`);
      return false;
    }
    return true;
  }, [allowedExtensions]);

  /**
   * Validates all files against size limits
   * @param filesToValidate Array of files to validate
   * @returns True if all files are valid
   */
  const validateFiles = useCallback(
    (filesToValidate: File[]): boolean => {
      for (const file of filesToValidate) {
        if (!validateFile(file)) {
          return false;
        }
      }

      if (files.length + filesToValidate.length > MAX_FILES) {
        toast.error(`You can upload a maximum of ${MAX_FILES} files`);
        return false;
      }

      return true;
    },
    [files.length, validateFile]
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
        const fileList = Array.from(event.target.files);

        // Validate files
        const validFiles = fileList.filter(validateFile);

        // Check if valid files and total count
        if (!validateFiles(validFiles)) {
          return;
        }

        setFiles((prev) => {
          const newFiles = [...prev, ...validFiles];
          onFilesChange(newFiles);
          return newFiles;
        });
      }
    },
    [validateFile, validateFiles, onFilesChange]
  );

  // Improved drag and drop handling
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files) {
        const fileList = Array.from(e.dataTransfer.files);

        // Validate files
        const validFiles = fileList.filter(validateFile);

        // Check if valid files and total count
        if (!validateFiles(validFiles)) {
          return;
        }

        setFiles((prev) => {
          const newFiles = [...prev, ...validFiles];
          onFilesChange(newFiles);
          return newFiles;
        });
      }
    },
    [validateFile, validateFiles, onFilesChange]
  );

  const handleRemoveFile = useCallback(
    (index: number) => {
      setFiles((prev) => {
        const newFiles = prev.filter((_, i) => i !== index);
        onFilesChange(newFiles);
        return newFiles;
      });
    },
    [onFilesChange]
  );

  return (
    <div className="space-y-2">
      <Label>Attachments</Label>
      <div className="flex space-x-4 mt-2 max-w-2xl overflow-x-auto shadow-sm">
        {existingFiles.map((file) => (
          <div
            key={file.name}
            className="flex flex-col items-center gap-1 w-36"
          >
            <div className="w-full h-24 border rounded-md">
              {file.file_url &&
              file.file_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                <img
                  src={file.file_url || "/placeholder.svg"}
                  alt={file.file_name}
                  className="w-full h-full object-cover rounded-md"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <File className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="flex justify-between w-full items-center">
              <div
                className="text-sm text-gray-500 truncate px-1 w-full"
                title={file.file_name}
              >
                {file.file_name}
              </div>
              {((getAttachmentOwner &&
                getAttachmentOwner(file.file_name) === currentUser) ||
                (getAttachmentOwner &&
                  getAttachmentOwner(file.file_name) === taskOwner)) && (
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-min"
                  style={{ paddingInline: 0 }}
                  onClick={() => onExistingFileRemove(file)}
                  disabled={disabled}
                  aria-label={`Remove file ${file.file_name}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
        {files.map((file, index) => (
          <div key={index} className="flex flex-col items-center gap-1 w-36">
            <div className="w-full h-24 border rounded-md">
              {file.type.startsWith("image/") ? (
                <img
                  src={URL.createObjectURL(file) || "/placeholder.svg"}
                  alt={file.name}
                  className="w-full h-full object-cover rounded-md"
                  onLoad={() => URL.revokeObjectURL(URL.createObjectURL(file))}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <File className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="flex justify-between w-full items-center">
              <div
                className="text-sm text-gray-500 truncate px-1 w-full"
                title={file.name}
              >
                {file.name}
              </div>
              <Button
                disabled={disabled}
                type="button"
                variant="link"
                className="p-0 h-min"
                style={{ paddingInline: 0 }}
                onClick={() => handleRemoveFile(index)}
                aria-label={`Remove file ${file.name}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        <ScrollBar orientation="horizontal" />
      </div>

      <div
        className={cn(
          "border-2 border-dashed border-[#cbd5e1] rounded-md p-8 text-center transition-colors",
          dragActive && "border-[#972e26] bg-[#972e26]/5"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        aria-label="File upload area"
      >
        <input
          disabled={disabled}
          type="file"
          multiple
          className="hidden"
          id="file-upload"
          onChange={handleFileChange}
          accept={allowedExtensions?.length ? allowedExtensions.map((extension) => `.${extension}`).join(",") : "image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Cloud className="h-10 w-10 mx-auto mb-2 text-[#94a3b8]" />
          <div className="text-sm text-[#64748b]">
            Drag your file(s) or{" "}
            <span className="text-[#972e26] cursor-pointer">browse</span>
          </div>
        </label>
      </div>
    </div>
  );
}

export default FileAttachmentHandler;
