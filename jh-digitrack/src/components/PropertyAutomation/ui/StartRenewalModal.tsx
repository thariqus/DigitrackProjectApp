import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, addYears } from "date-fns";
import { useSaveDoc } from "@/hooks/doc";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { debounce } from "lodash"; 

const schema = z.object({
  proposed_rent: z
    .string()
    .min(1, "Proposed Rent is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Must be a valid number greater than 0",
    }),
  renewal_from: z.string().min(1, "Renewal From date is required"),
  renewal_to: z.string().min(1, "Renewal To date is required"),
}).refine((data) => new Date(data.renewal_from) < new Date(data.renewal_to), {
  message: "Renewal To must be after Renewal From",
  path: ["renewal_to"], 
});

type FormData = z.infer<typeof schema>;


interface StartRenewalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyName: string;
  currentRent?: number | null;
  renewalFrom?: string;
  renewalTo?: string;
  mode?: "new" | "edit";
  onCreated?: () => Promise<void> | void;
}

export default function StartRenewalModal({
  open,
  onOpenChange,
  propertyId,
  propertyName,
  currentRent,
  renewalFrom,
  renewalTo,
  mode = 'new',
  onCreated
}: StartRenewalModalProps) {
  const queryClient = useQueryClient();
  const saveDoc = useSaveDoc();

  const isNewMode = mode === 'new';

  const [rentChangePercentState, setRentChangePercentState] = useState("0");

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      proposed_rent: isNewMode ? '' : (currentRent?.toString() || ''),
      renewal_from: '',
      renewal_to: '',
    },
  });

  // Debounced API call for rent calculation
  // const debouncedCalculateRent = useCallback(
  //   debounce(async (currentRent: number, proposedRentStr: string) => {
  //     const proposedRent = parseFloat(proposedRentStr);
  //     if (isNaN(proposedRent) || currentRent <= 0) {
  //       setRentChangePercentState("0");
  //       return;
  //     }
  //     try {
  //       const params = new URLSearchParams({
  //         current_rent: currentRent.toString(),
  //         proposed_rent: proposedRent.toString()
  //       });
  //       const res = await fetch(`/api/method/jh_digitrack.api.property_management.calculate_rent_change?${params}`, {
  //         credentials: "include",
  //       });
  //       const data = await res.json();
  //       setRentChangePercentState((data.message?.rent_change_percent || 0).toString());
  //     } catch (error) {
  //       console.error("Rent calc error:", error);
  //       setRentChangePercentState("0");
  //     }
  //   }, 500),
  //   []
  // );

  // Reset form and state when modal opens
  useEffect(() => {
    if (open) {
      form.reset({
        proposed_rent: isNewMode ? '' : (currentRent?.toString() || ''),
        renewal_from: '',
        renewal_to: '',
      });
      setRentChangePercentState("0");
    }
  }, [open, isNewMode, currentRent, form]);

  // Watch proposed_rent and trigger debounced calculation
  // const proposedRentValue = form.watch("proposed_rent");
  // useEffect(() => {
  //   if (currentRent && proposedRentValue) {
  //     debouncedCalculateRent(currentRent, proposedRentValue);
  //   }
  // }, [proposedRentValue, currentRent, debouncedCalculateRent]);

  const onSubmit = async (data: FormData) => {
    try {
      const proposedRentNum = Number(data.proposed_rent);
      // const rentChangePercentNum = Number(rentChangePercentState) || 0;

      const renewalDoc = {
        doctype: "JH Property Rental Renewal",
        property: propertyId,
        property_name: propertyName,
        current_rent: isNewMode ? null : (currentRent ?? 0),
        proposed_rent: proposedRentNum,
        // rent_change_percent: rentChangePercentNum,
        renewal_from: data.renewal_from,
        renewal_to: data.renewal_to,
        workflow_state: "Draft",
      };

      await saveDoc.mutateAsync(renewalDoc);
       await onCreated?.();
       onOpenChange(false);
    form.reset();
      toast.success("Renewal created successfully!");
      await queryClient.invalidateQueries({
        queryKey: ["RenewalList", { property: propertyId }],
      });
      onOpenChange(false);
      form.reset();
      // setRentChangePercentState("0");
    } catch (error: any) {
      console.error("Renewal creation error:", error);
      toast.error(error?.message || "Failed to create renewal");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-100" >
        <DialogHeader>
          <DialogTitle>Start Property Renewal</DialogTitle>
          <DialogDescription>
            Enter renewal details for <strong>{propertyName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col gap-1">
            <Label>Property Name</Label>
            <Input value={propertyName} readOnly className="bg-muted" />
          </div>

          <div>
            <Label>Current Rent</Label>
            <Input
              type="number"
              value={currentRent || 0}
              readOnly
              className="bg-muted"
            />

          </div>

          <div>
            <Label>Proposed Rent <span className="text-red-500">*</span></Label>
            <Controller
              name="proposed_rent"
              control={form.control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Enter proposed rent"
                />
              )}
            />
            {/* <div className="flex items-center gap-2 mt-1 text-sm">
              <Label className="text-gray-600 whitespace-nowrap">Rent Change %:</Label>
              <Input value={rentChangePercentState + "%"} readOnly className="bg-gray-100 w-24" />
            </div> */}
            {form.formState.errors.proposed_rent && (
              <p className="text-red-500 text-xs mt-1">
                {form.formState.errors.proposed_rent.message}
              </p>
            )}
          </div>

          <div>
            <Label>Renewal From  <span className="text-red-500">*</span></Label>
            <Controller
              name="renewal_from"
              control={form.control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="date"
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              )}
            />
            {form.formState.errors.renewal_from && (
              <p className="text-red-500 text-xs mt-1">
                {form.formState.errors.renewal_from.message}
              </p>
            )}
          </div>

          <div>
            <Label>Renewal To <span className="text-red-500">*</span></Label>
            <Controller
              name="renewal_to"
              control={form.control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="date"
                />
              )}
            />
            {form.formState.errors.renewal_to && (
              <p className="text-red-500 text-xs mt-1">
                {form.formState.errors.renewal_to.message}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creating..." : "Create Renewal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}