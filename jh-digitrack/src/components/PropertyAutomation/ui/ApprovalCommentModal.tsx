import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Controller } from "react-hook-form";
// import { toast } from "sonner";

const approvalSchema = z.object({
  comment: z.string().min(1, "Approval comment is required")
});

type ApprovalFormData = z.infer<typeof approvalSchema>;

interface ApprovalCommentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (action: string, comment: string) => void;
  renewalId: string;
  title?: string;
  action: "approve" | "submit" | "reject";
  description?: string;
}

export default function ApprovalCommentModal({ 
  open, 
  onOpenChange, 
  onApprove, 
  renewalId,
  title = "Approval Comment", 
  action = "approve",
  description = "Please provide your justification or notes for this action."
}: ApprovalCommentModalProps) {
  const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<ApprovalFormData>({
    resolver: zodResolver(approvalSchema),
    defaultValues: { comment: "" }
  });

  React.useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = (data: ApprovalFormData) => {
    onApprove(action, data.comment);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title || `${actionLabel} Renewal`}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2 overflow-x-hidden">
            <Label htmlFor="comment">Comment <span className="text-destructive">*</span></Label>
            <Controller
              name="comment"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="comment"
                  placeholder={`Enter your ${action} comment and justification...`}
                  rows={6}
                  {...field}
                  className={errors.comment ? "border-destructive" : "h-50"}
                />
              )}
            />
            {errors.comment && (
              <p className="text-sm text-destructive">{errors.comment.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !renewalId}>
              {isSubmitting ? `${actionLabel}ing...` : actionLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

