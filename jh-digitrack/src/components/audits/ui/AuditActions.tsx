import { Button } from "@/components/ui/button";
import { FileEdit, Trash2, ArchiveRestore } from "lucide-react";
import { useUpdateDoc } from "@/hooks/doc";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { JHAudits } from "@/types/JHDigitrack/JHAudits";

interface AuditActionProps {
  audit: JHAudits;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  hideDelete?: boolean;
  showRestore?: boolean;
}

export const AuditActions = ({
  audit,
  onEdit,
  onDelete,
  hideDelete,
  showRestore = false,
}: AuditActionProps) => {
  const updateDoc = useUpdateDoc();
  const queryClient = useQueryClient();
  const taskId = audit.name;

  const handleRestore = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    await updateDoc.mutateAsync({
      doc: {
        deleted_at: null,
      },
      name: taskId,
      doctype: "JH Tasks Master",
    });

    await queryClient.invalidateQueries({
      queryKey: ["Docs"],
    });
    toast.success("Task restored successfully");
  };

  return (
    <div className="flex justify-center">
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(taskId);
        }}
      >
        <FileEdit className="h-4 w-4" />
      </Button>
      {!hideDelete && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(taskId);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
      {showRestore && (
        <Button variant="ghost" size="icon" onClick={handleRestore}>
          <ArchiveRestore className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default AuditActions;
