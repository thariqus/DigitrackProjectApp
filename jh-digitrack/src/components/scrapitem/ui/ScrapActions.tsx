import { Button } from "@/components/ui/button";
import { FileEdit, Trash2, ArchiveRestore } from "lucide-react";
import { useUpdateDoc } from "@/hooks/doc";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { JHScrapItem } from "@/types/JHDigitrack/JHScrapItem";

interface ScrapActionsProps {
  scrap: JHScrapItem;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  hideDelete?: boolean;
  showRestore?: boolean;
}

export const ScrapActions = ({
  scrap,
  onEdit,
  onDelete,
  hideDelete,
  showRestore = false,
}: ScrapActionsProps) => {
  const updateDoc = useUpdateDoc();
  const queryClient = useQueryClient();
  const scrapId = scrap.name;

  const handleRestore = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      await updateDoc.mutateAsync({
        doc: {
          deleted_at: null,
        },
        name: scrapId,
        doctype: "JH Scrap Item", // make sure this matches your doctype
      });
      await queryClient.invalidateQueries({ queryKey: ["scrap-items"] });
      toast.success("Scrap item restored successfully");
    } catch (err) {
      toast.error("Failed to restore scrap item");
    }
  };

  return (
    <div className="flex justify-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(scrapId);
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
            onDelete(scrapId);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
      {showRestore && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRestore}
        >
          <ArchiveRestore className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default ScrapActions;
