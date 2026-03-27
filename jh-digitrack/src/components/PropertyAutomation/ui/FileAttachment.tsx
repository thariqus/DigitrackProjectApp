import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { File, X, Cloud } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export default function FileAttachment() {
  return (
    <div className="space-y-2 " >
      <Label>Attachments</Label>
      <div className="flex space-x-4 mt-2 max-w-2xl overflow-x-auto shadow-sm">
        {/* {existingFiles.map((file) => (
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
        ))} */}
        {/* {files.map((file, index) => (
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
        ))} */}
        <ScrollBar orientation="horizontal" />
      </div>

      <div
        className={cn(
          "border-2 border-dashed border-[#cbd5e1] rounded-md p-8 text-center transition-colors"
        )}
        // onDrop={handleDrop}
        // onDragOver={handleDragOver}
        // onDragEnter={handleDragEnter}
        // onDragLeave={handleDragLeave}
        aria-label="File upload area"
      >
        <input
        //   disabled={disabled}
          type="file"
          multiple
          className="hidden"
          id="file-upload"
          placeholder="Upload files"
        //   onChange={handleFileChange}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
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