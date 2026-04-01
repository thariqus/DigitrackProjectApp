import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { File, X, Cloud } from "lucide-react";
import { ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface FileAttachmentProps {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

export default function FileAttachment({files,setFiles}: FileAttachmentProps) {

  const [isDragging, setIsDragging] = useState(false);

  // Handle file input selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  };

  // Handle drag drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files) {
      setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragEnter = () => setIsDragging(true);
  const handleDragLeave = () => setIsDragging(false);

  // Remove file
  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2 mb-10">

      {/* File Preview Section */}
      <div className="flex space-x-4 mt-2 max-w-2xl overflow-x-auto shadow-sm pb-2">
        {files.length > 0 ? (
          files.map((file, index) => {
            const preview = URL.createObjectURL(file);

            return (
              <div
                key={index}
                className="flex flex-col items-center gap-1 w-36"
              >
                {/* Preview */}
                <div className="w-full h-24 border rounded-md overflow-hidden">
                  {file.type.startsWith("image/") ? (
                    <img
                      src={preview}
                      alt={file.name}
                      className="w-full h-full object-cover"
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
                    className="text-sm text-gray-500 truncate px-1 w-full"
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

        <ScrollBar orientation="horizontal" />
      </div>

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
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        />

        {/* Upload UI */}
        <label htmlFor="file-upload" className="cursor-pointer">
          <Cloud className="h-10 w-10 mx-auto mb-2 text-[#94a3b8]" />

          <div className="text-sm text-[#64748b]">
            Drag your file(s) or{" "}
            <span className="text-[#972e26] font-medium">
              browse
            </span>
          </div>
        </label>
      </div>
    </div>
  );
}