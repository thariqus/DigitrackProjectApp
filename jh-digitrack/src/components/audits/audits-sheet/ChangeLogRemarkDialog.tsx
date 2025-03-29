import { PopoverContent } from "@/components/ui/popover";

import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { Dialog } from "@/components/ui/dialog";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface ChangelogRemarkDialogProps {
  open: boolean;
  showCompletionDatePicker?: boolean;
  onOpenChange: (open: boolean) => void;
  changelogComment: string;
  setChangelogComment: (comment: string) => void;
  setCompletionDate?: (date: string) => void;
  completionDate?: string;
  confirmChangelogRemark: () => void;
}

const ChangelogRemarkDialog = ({
  open,
  onOpenChange,
  changelogComment,
  setChangelogComment,
  confirmChangelogRemark,
  showCompletionDatePicker,
  setCompletionDate,
  completionDate,
}: ChangelogRemarkDialogProps) => {
  const renderCompletionDatePicker =
    showCompletionDatePicker && setCompletionDate && completionDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Remark</DialogTitle>
          <DialogDescription>
            Please provide a comment for this change.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Enter your remark here..."
            value={changelogComment}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setChangelogComment(e.target.value)
            }
            className="min-h-[100px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                confirmChangelogRemark();
              }
            }}
          />
        </div>
        {renderCompletionDatePicker && (
          <div className="pb-4 mb-1">
            <span className="text-sm font-medium">Completion Date</span>
            <div className="grid gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !completionDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {completionDate ? (
                      format(new Date(completionDate), "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    required
                    selected={
                      completionDate ? new Date(completionDate) : undefined
                    }
                    onSelect={(date) =>
                      date && setCompletionDate(date.toISOString())
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={confirmChangelogRemark}
            className="bg-[#972e26] hover:bg-[#972e26]/90"
          >
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangelogRemarkDialog;
