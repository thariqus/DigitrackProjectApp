import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Controller } from "react-hook-form";

const sendBackSchema = z.object({
  target_state: z.string().min(1, "Please select a previous state"),
  comment: z.string().min(1, "Reason for send back is required")
});

type SendBackFormData = z.infer<typeof sendBackSchema>;

interface SendBackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sendback_options: string[];
  onSendBack: (target_state: string, comment: string) => void;
  renewalId: string | null;
  title?: string;
}

export default function SendBackModal({ 
  open, 
  onOpenChange, 
  sendback_options, 
  onSendBack, 
  renewalId,
  title = "Send Back Renewal"
}: SendBackModalProps) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<SendBackFormData>({
    resolver: zodResolver(sendBackSchema),
    defaultValues: { target_state: "", comment: "" }
  });

  React.useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = (data: SendBackFormData) => {
    if (renewalId) {
      onSendBack(data.target_state, data.comment);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Select previous workflow step and provide reason to restart approval from there.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="target_state">Send back to <span className="text-destructive">*</span></Label>
            <Controller
              name="target_state"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select previous state" />
                  </SelectTrigger>
                  <SelectContent>
                    {sendback_options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option.startsWith("Pending ") ? option.slice("Pending ".length) : option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.target_state && (
              <p className="text-sm text-destructive">{errors.target_state.message}</p>
            )}
          </div>
          <div className="space-y-2 overflow-x-hidden">
            <Label htmlFor="comment">Reason <span className="text-destructive">*</span></Label>
            <Controller
              name="comment"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="comment"
                  placeholder="Enter reason for sending back..."
                  rows={6}
                  {...field}
                  className={errors.comment ? "border-destructive" :"" }
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
              {isSubmitting ? "Sending back..." : "Send Back"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
