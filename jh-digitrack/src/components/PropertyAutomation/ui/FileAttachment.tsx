import { useState } from "react";
import { Button } from "@/components/ui/button";
import { File, X, Cloud, AlertCircle } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".xlsx", ".png", ".jpg", ".jpeg"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function validateFile(file: File): string | null {
  const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
  const validType = ALLOWED_EXTENSIONS.includes(ext) || ALLOWED_MIME_TYPES.includes(file.type);
  if (!validType) {
    return `"${file.name}" — unsupported file type. Allowed: PDF, DOC, DOCX, XLSX, PNG, JPG.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `"${file.name}" exceeds the 10 MB size limit.`;
  }
  return null;
}

interface FileAttachmentProps {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

export default function FileAttachment({files, setFiles}: FileAttachmentProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const addFiles = (incoming: File[]) => {
    const newErrors: string[] = [];
    const valid: File[] = [];
    for (const file of incoming) {
      const err = validateFile(file);
      if (err) newErrors.push(err);
      else valid.push(file);
    }
    setErrors(newErrors);
    if (valid.length > 0) setFiles((prev) => [...prev, ...valid]);
  };

  // Handle file input selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  // Handle drag drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragEnter = () => { setIsDragging(true); setErrors([]); };
  const handleDragLeave = () => setIsDragging(false);

  // Remove file
  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2 mb-10">

      {/* File Preview Section */}
      <ScrollArea className="w-full max-w-2xl shadow-sm pb-2">
        <div className="flex space-x-4 mt-2">
          {files.length > 0 ? (
            files.map((file, index) => {
              const preview = URL.createObjectURL(file);

              return (
                <div
                  key={index}
                  className="flex flex-col items-center gap-1 w-36 shrink-0"
                >
                  {/* Preview */}
                  <div className="w-full h-24 border rounded-md overflow-hidden">
                    {file.type.startsWith("image/") ? (
                      <img
                        src={preview}
                        alt={file.name}
                        className="w-full h-full object-fit"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <File className="h-8 w-8 text-gray-500" />
                      </div>
                    )}
                  </div>

                  {/* Name + Delete */}
                  <div className="flex justify-between w-full items-center">
                    <div
                      className="text-xs text-gray-500 truncate px-1 w-full"
                      title={file.name}
                    >
                      {file.name}
                    </div>

                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-min"
                      onClick={() => handleRemoveFile(index)}
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-400">No files selected</p>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((err, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}

      {/* Drag & Drop Area */}
      <div
        className={cn(
          "border-2 border-dashed rounded-md p-8 text-center transition-colors",
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-[#cbd5e1]"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        {/* Hidden Input */}
        <input
          type="file"
          multiple
          className="hidden"
          id="file-upload"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg"
        />

        {/* Upload UI */}
        <label htmlFor="file-upload" className="cursor-pointer">
          <Cloud className="h-10 w-10 mx-auto mb-2 text-[#94a3b8]" />

          <div className="text-sm text-[#64748b]">
            Drag your file(s) or{" "}
            <span className="text-[#972e26] font-medium">browse</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            PDF, DOC, DOCX, XLSX, PNG, JPG — max 10 MB size
          </div>
        </label>
      </div>

    </div>
  );
}