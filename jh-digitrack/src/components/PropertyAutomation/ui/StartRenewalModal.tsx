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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { useSaveDoc } from "@/hooks/doc";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import FileAttachment from "./FileAttachment";
 
export interface AdditionalChargeEntry {
  label: string;
  amount: string;
  vatIncluded: boolean;
}
 
const calculateRenewalTo = (fromDate: string, tenancyPeriod: string): string | null => {
  if (!fromDate || !tenancyPeriod) return null;
  const match = tenancyPeriod.match(/^(\d+)\s*(Months?|Weeks?|Years?)$/i);
  if (!match) return null;
  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const date = new Date(fromDate);
  if (unit.startsWith("month")) {
    date.setMonth(date.getMonth() + amount);
  } else if (unit.startsWith("year")) {
    date.setFullYear(date.getFullYear() + amount);
  } else if (unit.startsWith("week")) {
    date.setDate(date.getDate() + amount * 7);
  }
  return date.toISOString().split("T")[0];
};
 
const isNumeric = (val: string | undefined) =>
  val === undefined || val === "" || (!isNaN(Number(val)) && val.trim() !== "");
 
const schema = z
  .object({
    proposed_rent: z
      .string()
      .min(1, "Proposed Rent is required")
      .refine((val) => !isNaN(Number(val)) && val.trim() !== "", {
        message: "Only numbers allowed",
      })
      .refine((val) => Number(val) > 0, {
        message: "Must be greater than 0",
      }),
    renewal_from: z.string().min(1, "Renewal From date is required"),
    renewal_to: z.string().min(1, "Renewal To date is required"),
    additional_charges: z
      .string()
      .optional()
      .refine(isNumeric, { message: "Only numbers allowed" }),
    payment_schedule: z.string().optional(),
    new_security_deposit: z
      .string()
      .optional()
      .refine(isNumeric, { message: "Only numbers allowed" }),
    remarks: z.string().optional(),
  })
  .refine((data) => new Date(data.renewal_from) < new Date(data.renewal_to), {
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
  tenancyPeriod?: string;
  mode?: "new" | "edit";
}
 
export default function StartRenewalModal({
  open,
  onOpenChange,
  propertyId,
  propertyName,
  currentRent,
  renewalFrom,
  renewalTo,
  tenancyPeriod,
  mode = "new",
}: StartRenewalModalProps) {
  const queryClient = useQueryClient();
  const saveDoc = useSaveDoc();
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalChargeEntry[]>([]);
  const [vatIncluded, setVatIncluded] = useState(false);
 
  const isNewMode = mode === "new";
 
  const initialRenewalTo = renewalTo || (renewalFrom && tenancyPeriod ? calculateRenewalTo(renewalFrom, tenancyPeriod) : "") || "";
 
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      proposed_rent: isNewMode ? "" : currentRent?.toString() || "",
      renewal_from: renewalFrom || "",
      renewal_to: initialRenewalTo,
      additional_charges: "",
      payment_schedule: "",
      new_security_deposit: "",
      remarks: "",
    },
  });
 
  const proposedRentWatch = useWatch({ control: form.control, name: "proposed_rent" });
  const renewalFromWatch = useWatch({ control: form.control, name: "renewal_from" });
 
  const proposedRent = Number(proposedRentWatch || 0);
 
  const vatAmount = Number((proposedRent * 0.05).toFixed(2));
 
  const rentChangePercent = (() => {
    const current = Number(currentRent || 0);
    const proposed = Number(proposedRentWatch || 0);
    if (current <= 0 || proposed <= 0) return "0";
    return (((proposed - current) / current) * 100).toFixed(2);
  })();
 
  const rentChangeAmount = (() => {
    const current = Number(currentRent || 0);
    const proposed = Number(proposedRentWatch || 0);
    if (proposed <= 0) return "0";
    return Math.round(proposed - current).toString();
  })();
 
  useEffect(() => {
    if (open) {
      const resolvedRenewalTo = renewalTo || (renewalFrom && tenancyPeriod ? calculateRenewalTo(renewalFrom, tenancyPeriod) : "") || "";
      form.reset({
        proposed_rent: isNewMode ? "" : currentRent?.toString() || "",
        renewal_from: renewalFrom || "",
        renewal_to: resolvedRenewalTo,
        additional_charges: "",
        payment_schedule: "",
        new_security_deposit: "",
        remarks: "",
      });
      setSupportingFiles([]);
      setAdditionalCharges([]);
    }
  }, [open, isNewMode, currentRent, form, renewalFrom, renewalTo, tenancyPeriod]);
 
  useEffect(() => {
    if (!renewalFromWatch || !tenancyPeriod) return;
    const calculated = calculateRenewalTo(renewalFromWatch, tenancyPeriod);
    if (calculated) {
      form.setValue("renewal_to", calculated, { shouldValidate: true, shouldDirty: true });
    }
  }, [renewalFromWatch, tenancyPeriod, form]);
 
  useEffect(() => {
  if (vatIncluded) {
    setAdditionalCharges((prev) => {
      const otherCharges = prev.filter(
        (item) => item.label !== "Rent Vat"
      );
 
      return [
        ...otherCharges,
        {
          label: "Rent Vat",
          amount: vatAmount.toFixed(2)
        },
      ];
    });
  } else {
    setAdditionalCharges((prev) =>
      prev.filter((item) => item.label !== "Rent Vat")
    );
  }
}, [vatIncluded, vatAmount]);
 
  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("is_private", "1");
    const csrfToken =
      (window as { frappe?: { csrf_token?: string } })?.frappe?.csrf_token || "";
 
    const res = await fetch("/api/method/upload_file", {
      method: "POST",
      body: formData,
      credentials: "include",
      headers: csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : undefined,
    });
 
    const data = await res.json();
    if (!res.ok || !data?.message?.file_url) {
      throw new Error("File upload failed");
    }
    return data.message.file_url as string;
  };
 
  const onSubmit = async (data: FormData) => {
    try {
      const proposedRentNum = Number(data.proposed_rent);
      const current = Number(currentRent || 0);
      const rentPercent =
        current > 0 ? ((proposedRentNum - current) / current) * 100 : 0;
 
      const supportingDocuments =
        supportingFiles.length > 0
          ? (await Promise.all(supportingFiles.map(uploadFile))).map((url) => ({
              attachment: url,
            }))
          : [];
 
     const particulars = additionalCharges.flatMap((entry) => {
  if (!entry.label.trim()) return [];

  const rows = [
    {
      label: entry.label.trim(),
      amount: Number(entry.amount || 0),
      vat: entry.vatIncluded,
    },
  ];

  if (entry.vatIncluded) {
    rows.push({
      label: `${entry.label.trim()} Vat`,
      amount: Number((Number(entry.amount || 0) * 0.05).toFixed(2)),
      vat: false,
    });
  }

  return rows;
});
 
      const renewalDoc = {
        doctype: "JH Property Rental Renewal",
        property: propertyId,
        property_name: propertyName,
        current_rent: currentRent ?? 0,
        proposed_rent: proposedRentNum,
        rent_change: Math.round(proposedRentNum - current),
        rent_change_percent: rentPercent,
        renewal_from: data.renewal_from,
        renewal_to: data.renewal_to,
        additional_charges: Number(data.additional_charges || 0),
        payment_schedule: data.payment_schedule || "",
        new_security_deposit: Number(data.new_security_deposit || 0),
        remarks: data.remarks || "",
        supporting_documents: supportingDocuments,
        workflow_state: "Draft",
        table_xqmr: particulars,
      };
 
      await saveDoc.mutateAsync(renewalDoc);
      onOpenChange(false);
      form.reset();
      setSupportingFiles([]);
      setAdditionalCharges([]);
      toast.success("Renewal created successfully!");
      await queryClient.invalidateQueries({ queryKey: ["RenewalList"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["PendingRenewals"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["PropertyList"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["PropertyDoc", propertyId], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["PropertyDashboardCounts"] });
      await queryClient.invalidateQueries({ queryKey: ["RenewalPipelineCounts"] });
    } catch (error: unknown) {
      console.error("Renewal creation error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create renewal"
      );
    }
  };
 
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-full max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start Property Renewal</DialogTitle>
          <DialogDescription>
            Enter renewal details for <strong>{propertyName}</strong>
          </DialogDescription>
        </DialogHeader>
 
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2.5">
          {/* Property Name */}
          <div className="flex flex-col gap-1">
            <Label className="text-sm text-gray-600">Property Name</Label>
            <Input value={propertyName} readOnly className="bg-muted" />
          </div>
 
          {/* Current Rent / Proposed Rent / Rent Change Amount / Rent Change % */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-sm text-gray-600">Current Rent</Label>
              <Input
                type="number"
                value={currentRent || 0}
                readOnly
                className="bg-muted"
              />
            </div>
 
            <div className="flex flex-col gap-1">
              <Label className="text-sm text-gray-600">
                Proposed Rent <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="proposed_rent"
                control={form.control}
                render={({ field }) => (
                  <Input {...field} type="text" inputMode="decimal" placeholder="0.00" />
                )}
              />
              {form.formState.errors.proposed_rent && (
                <p className="text-red-500 text-xs">
                  {form.formState.errors.proposed_rent.message}
                </p>
              )}
            </div>
 
            <div className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={vatIncluded}
                onChange={(e) => setVatIncluded(e.target.checked)}
              />
              <Label className="text-sm text-gray-600">
                Vat Include
              </Label>
            </div>
 
            <div className="flex flex-col gap-1">
              <Label className="text-sm text-gray-600">Rent Increase Amount</Label>
              <Input
                value={rentChangeAmount}
                readOnly
                className="bg-muted"
              />
            </div>
 
            <div className="flex flex-col gap-1">
              <Label className="text-sm text-gray-600">Rent Change %</Label>
              <Input
                value={`${rentChangePercent}%`}
                readOnly
                className="bg-muted"
              />
            </div>
 
            {/* Payment Schedule */}
                <div className="flex flex-col gap-1">
                  <Label className="text-sm text-gray-600">Payment Schedule</Label>
                  <Controller
                    name="payment_schedule"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select schedule" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                          <SelectItem value="Quarterly">Quarterly</SelectItem>
                          <SelectItem value="Half Yearly">Half Yearly</SelectItem>
                          <SelectItem value="Yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
              </div>
         
          {/* Renewal From / Renewal To */}
            <div className="flex flex-col gap-1">
              <Label className="text-sm text-gray-600">
                Renewal From <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="renewal_from"
                control={form.control}
                render={({ field }) => (
                  <Input
                    {...field}
                    disabled
                    type="date"
                    min={format(new Date(), "yyyy-MM-dd")}
                  />
                )}
              />
              {form.formState.errors.renewal_from && (
                <p className="text-red-500 text-xs">
                  {form.formState.errors.renewal_from.message}
                </p>
              )}
            </div>
 
            <div className="flex flex-col gap-1">
              <Label className="text-sm text-gray-600">
                Renewal To <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="renewal_to"
                control={form.control}
                render={({ field }) => (
                  <Input {...field} type="date" />
                )}
              />
              {form.formState.errors.renewal_to && (
                <p className="text-red-500 text-xs">
                  {form.formState.errors.renewal_to.message}
                </p>
              )}
            </div>
              
            {/* <div className="flex flex-col gap-1">
              <Label className="text-sm text-gray-600">New Security Deposit</Label>
              <Controller
                name="new_security_deposit"
                control={form.control}
                render={({ field }) => (
                  <Input {...field} type="text" inputMode="decimal" placeholder="0" />
                )}
              />
              {form.formState.errors.new_security_deposit && (
                <p className="text-red-500 text-xs">
                  {form.formState.errors.new_security_deposit.message}
                </p>
              )}
            </div> */}
          </div>
 
          {/* Particulars */}
          <div className="flex flex-col gap-1">
            <Label className="text-sm text-gray-600">Particulars</Label>
            <div className="flex flex-col gap-2">
             {additionalCharges.map((entry, index) => {
                const amount = Number(entry.amount || 0);
                const vatAmount = entry.vatIncluded
                  ? (amount *  0.05).toFixed(2)
                  : amount.toFixed(2);
 
                return (
              <div key={index} className="bg-muted p-3 rounded-lg">
                <div className="flex gap-2 items-center">
                  {/* Left side - all fields */}
                  <div className="flex-1">
                    {/* First Row */}
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 flex flex-col gap-1">
                        <Label className="text-xs">Label</Label>
                        <Input
                        value={entry.label}
                         readOnly={entry.label === "Rent Vat"}
                          className={entry.label === "Rent Vat" ? "bg-muted cursor-not-allowed" : ""}
                          onChange={(e) => {
                            if (entry.label === "Rent Vat") return;
                            const next = [...additionalCharges];
                            next[index] = { ...next[index], label: e.target.value };
                            setAdditionalCharges(next);
                          }}
                        />
                      </div>

                      <div className="flex-1 flex flex-col gap-1">
                        <Label className="text-xs">Amount</Label>
                        <Input
                            type="text"
                            inputMode="decimal"
                            value={entry.amount}
                            readOnly={entry.label === "Rent Vat"}
                            className={entry.label === "Rent Vat" ? "bg-muted cursor-not-allowed" : ""}
                            onChange={(e) => {
                              if (entry.label === "Rent Vat") return;

                              const value = e.target.value;
                              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                const next = [...additionalCharges];
                                next[index] = {
                                  ...next[index],
                                  amount: value,
                                };
                                setAdditionalCharges(next);
                              }
                            }}
                          />
                      </div>

                      {
                        entry.label !== "Rent Vat" && (
                          <div className="flex items-center gap-2 pt-6">
                        <input
                          type="checkbox"
                          checked={entry.vatIncluded}
                          onChange={(e) => {
                            const next = [...additionalCharges];
                            next[index] = {
                              ...next[index],
                              vatIncluded: e.target.checked,
                            };
                            setAdditionalCharges(next);
                          }}
                        />
                        <Label className="text-xs">VAT</Label>
                      </div>
                        )

                      }    
                      
                    </div>

                    {/* VAT Row */}
                    {entry.vatIncluded && (
                      <div className="flex gap-2 mt-3">
                        <div className="flex-1 flex flex-col gap-1">
                          <Label className="text-xs">Label</Label>
                          <Input value={`${entry.label} Vat`}  readOnly />
                        </div>

                        <div className="flex-1 flex flex-col gap-1 mr-12">
                          <Label className="text-xs">Amount</Label>
                          <Input value={vatAmount} readOnly />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Remove button centered across both rows */}
                  <div className="self-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setAdditionalCharges(
                          additionalCharges.filter((_, i) => i !== index)
                        )
                      }
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              )})}
              <Button
                type="button"
                variant="outline"
                className="w-full text-gray-400 border-2 border-dashed h-10 text-sm"
                onClick={() => setAdditionalCharges([
                  ...additionalCharges,
                  {
                    label: "",
                    amount: "",
                    vatIncluded: false,
                  },
                ])}
              >
                + Add Particulars
              </Button>
            </div>
          </div>
 
          {/* Remarks */}
          <div className="flex flex-col gap-1">
            <Label className="text-sm text-gray-600">Remarks</Label>
            <textarea
              {...form.register("remarks")}
              className="border rounded-md p-2 h-30 resize-vertical text-sm"
              placeholder="Any additional notes..."
            />
          </div>
         
 
 
          {/* Supporting Documents */}
          <div className="flex flex-col gap-1">
            <Label className="text-sm text-gray-600">Supporting Documents</Label>
            <FileAttachment files={supportingFiles} setFiles={setSupportingFiles} />
          </div>
 
          <DialogFooter className="gap-2 ">
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
 
 