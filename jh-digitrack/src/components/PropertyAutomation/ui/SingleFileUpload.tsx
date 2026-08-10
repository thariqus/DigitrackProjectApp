import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { File as FileIcon, X, UploadCloud } from "lucide-react";

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

const isImageUrl = (url: string) => /\.(png|jpg|jpeg)$/i.test(url);

interface SingleFileUploadProps {
  file: File | null;
  setFile: (file: File | null) => void;
  existingUrl?: string;
  label?: string;
}

export default function SingleFileUpload({
  file,
  setFile,
  existingUrl,
  label = "Upload document",
}: SingleFileUploadProps) {
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!selected) return;
    const err = validateFile(selected);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setFile(selected);
  };

  const preview = file ? URL.createObjectURL(file) : existingUrl;
  const isImage = file ? file.type.startsWith("image/") : existingUrl ? isImageUrl(existingUrl) : false;
  const fileName = file?.name ?? existingUrl?.split("/").pop();

  return (
    <div className="flex flex-col gap-1 mt-2">
      <input
        type="file"
        id={inputId}
        className="hidden"
        onChange={handleFileChange}
        accept={ALLOWED_EXTENSIONS.join(",")}
      />

      {preview ? (
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 border rounded-md overflow-hidden flex items-center justify-center shrink-0 bg-gray-50">
            {isImage ? (
              <img src={preview} alt={fileName} className="w-full h-full object-cover" />
            ) : (
              <FileIcon className="h-5 w-5 text-gray-500" />
            )}
          </div>
          <span className="text-xs text-gray-600 truncate max-w-[140px]" title={fileName}>
            {fileName}
          </span>
          {file ? (
            <Button
              type="button"
              variant="link"
              className="p-0 h-min"
              onClick={() => setFile(null)}
            >
              <X className="h-4 w-4 text-red-500" />
            </Button>
          ) : (
            <label htmlFor={inputId} className="text-xs text-[#972e26] font-medium cursor-pointer underline">
              Replace
            </label>
          )}
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="inline-flex border border-primary border-dashed rounded-sm  items-center gap-1 text-xs text-[#972e26] font-medium cursor-pointer w-fit p-1"
        >
          <UploadCloud className="h-4 w-4" />
          {label}
        </label>
      )}

      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
