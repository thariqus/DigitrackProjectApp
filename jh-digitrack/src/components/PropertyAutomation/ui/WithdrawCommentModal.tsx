import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Controller } from "react-hook-form";

const withdrawSchema = z.object({
  comment: z.string().min(1, "Withdrawal reason is required")
});

type WithdrawFormData = z.infer<typeof withdrawSchema>;

interface WithdrawCommentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWithdraw: (comment: string) => void;
  propertyId: string | null;
}

export default function WithdrawCommentModal({ 
  open, 
  onOpenChange, 
  onWithdraw, 
  propertyId 
}: WithdrawCommentModalProps) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<WithdrawFormData>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: { comment: "" }
  });

  React.useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = (data: WithdrawFormData) => {
    if (propertyId) {
      onWithdraw(data.comment);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw Renewal</DialogTitle>
          <DialogDescription>
            Please provide a reason for withdrawing this renewal process.
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
                  placeholder="Enter the reason for withdrawal..."
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
              {isSubmitting ? "Withdrawing..." : "Withdraw Renewal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
