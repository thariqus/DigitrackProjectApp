import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Controller } from "react-hook-form";

const pullBackSchema = z.object({
  comment: z.string().min(1, "Reason for pulling back is required")
});

type PullBackFormData = z.infer<typeof pullBackSchema>;

interface PullBackCommentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPullBack: (comment: string) => void;
  propertyId: string | null;
}

export default function PullBackCommentModal({
  open,
  onOpenChange,
  onPullBack,
  propertyId
}: PullBackCommentModalProps) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<PullBackFormData>({
    resolver: zodResolver(pullBackSchema),
    defaultValues: { comment: "" }
  });

  React.useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = (data: PullBackFormData) => {
    if (!propertyId) return;
    onPullBack(data.comment);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pull Back Renewal</DialogTitle>
          <DialogDescription>
            This will recall the renewal from its current approval level and move it back to Draft. Please provide a reason.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2 overflow-x-hidden">
            <Label htmlFor="comment">Reason <span className="text-destructive">*</span></Label>
            <Controller
              name="comment"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="comment"
                  placeholder="Enter the reason for pulling back this renewal..."
                  rows={6}
                  {...field}
                  className={errors.comment ? "border-destructive h-50" : "h-50 overflow-x-hidden"}
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
            <Button type="submit" disabled={isSubmitting || !propertyId}>
              {isSubmitting ? "Pulling back..." : "Pull Back to Draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
