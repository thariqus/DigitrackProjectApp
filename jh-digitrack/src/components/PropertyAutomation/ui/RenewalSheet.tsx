import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import RenewalTimeline from "./RenewalTimeline";
import WithdrawCommentModal from "./WithdrawCommentModal";
import SendBackModal from "./SendBackModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { XIcon } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import FileAttachment from "./FileAttachment";
import { useQueryClient } from "@tanstack/react-query";
import { useDocs, useSaveDoc, useUpdateDoc } from "@/hooks/doc";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChequeDetail, PropertyMaster, RentalRenewal } from "@/types/JHDigitrack/JHPropertyAutomation";
import { usePropertyDoc, useRenewalDoc } from "../hooks/useProperty";
import { propertyApi } from "../api/property";
import { useApplyWorkflowAction } from "../hooks/useApplyWorkflowAction";

type RenewalSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string | null;
  mode: "view" | "edit" | "create";
  formatDate: (date?: string) => string;
  workflowColorHighlight?: (date?: string) => string;
  typeOptions?: string[];
  isLicensingTeam: boolean;
  isJHPropertyDepartment: boolean;
  isCfo: boolean;
  isGMTeam: boolean;
  isMD: boolean;
  isApprover: boolean;
  isGLTeam: boolean;
  isApprover1: boolean;
  isApprover2: boolean;
};

const renewalSchema = z.object({
  division: z.string().optional(),
  proposed_rent: z.coerce.number().min(0).optional(),
  renewal_from: z.string().optional(),
  renewal_to: z.string().optional(),
  additional_charges: z.coerce.number().min(0).optional(),
  payment_schedule: z.string().optional(),
  new_security_deposit: z.coerce.number().min(0).optional(),
  remarks: z.string().optional(),
  po_number: z.string().optional(),
  miro_number: z.string().optional(),
  bank_name: z.string().optional(),
  cheque_number: z.string().optional(),
  cheque_amount: z.coerce.number().min(0).optional(),
  cheque_date: z.string().optional(),
  payee: z.string().optional(),
  signatory: z.string().optional(),
}).partial();

export default function RenewalSheet({
  open,
  onOpenChange,
  propertyId,
  mode,
  formatDate,
  workflowColorHighlight,
  isLicensingTeam,
  isJHPropertyDepartment,
  isCfo,
  isGMTeam,
  isMD,
  isApprover,
  isGLTeam,
  isApprover1,
  isApprover2,
}: RenewalSheetProps) {
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);
  const [contractFiles, setContractFiles] = useState<File[]>([]);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isSendBackModalOpen, setIsSendBackModalOpen] = useState(false);
  const [pendingWithdrawalId, setPendingWithdrawalId] = useState<string | null>(null);
  const [pendingSendBackId, setPendingSendBackId] = useState<string | null>(null);
  const [sendbackOptions, setSendbackOptions] = useState<string[]>([]);
  const [rentChangePercentState, setRentChangePercentState] = useState("0");
  const [currentChequeDetails, setCurrentChequeDetails] = useState<ChequeDetail[]>([]);
  const [localModified, setLocalModified] = useState<string>("");

  const queryClient = useQueryClient();
  const saveDoc = useSaveDoc();
  const updateDoc = useUpdateDoc();

  const isView = mode === "view";
  const isEdit = mode === "edit";
  const formId = "renewal-form";
  

  const applyActionRef = useRef<((payload: any, options?: any) => void) | null>(null);
  const workflowMutation = useApplyWorkflowAction();
  applyActionRef.current = workflowMutation.mutate;

  const { data: renewalData, isLoading: renewalLoading, refetch: refetchRenewal } =
    useRenewalDoc(propertyId || undefined);

  const renewalDoc = renewalData?.doc as RentalRenewal | undefined;

  const { data: propertyData, refetch: refetchProperty } = usePropertyDoc(
    renewalDoc?.property
  );
  const property = propertyData?.doc as PropertyMaster | undefined;

  const { data: divisionData } = useDocs({
    doctype: "JH Division Master",
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting, isValid },
    setValue,
    getValues,
  } = useForm({
    resolver: zodResolver(renewalSchema),
    mode: "onChange",
  });

  const proposedRent = useWatch({ control, name: "proposed_rent" }) || 0;
  const currentRent = property?.current_rent || 0;

  useEffect(() => {
    if (open) {
      setSupportingFiles([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !renewalDoc) return;

    setLocalModified(renewalDoc.modified || "");
    setCurrentChequeDetails(renewalDoc.cheque_details || []);

    reset({
      division: renewalDoc.division || "",
      proposed_rent: Number(renewalDoc.proposed_rent || 0),
      renewal_to: renewalDoc.renewal_to || "",
      renewal_from: renewalDoc.renewal_from || "",
      additional_charges: Number(renewalDoc.additional_charges || 0),
      payment_schedule: renewalDoc.payment_schedule || "",
      new_security_deposit: Number(renewalDoc.new_security_deposit || 0),
      remarks: renewalDoc.remarks || "",
      po_number: renewalDoc.po_number || "",
      miro_number: renewalDoc.miro_number || "",
      bank_name: renewalDoc.cheque_details?.[0]?.bank_name || "",
      cheque_number: renewalDoc.cheque_details?.[0]?.cheque_number || "",
      cheque_amount: Number(renewalDoc.cheque_details?.[0]?.cheque_amount || 0),
      cheque_date: renewalDoc.cheque_details?.[0]?.cheque_date || "",
      payee: renewalDoc.cheque_details?.[0]?.payee || "",
      signatory: renewalDoc.cheque_details?.[0]?.signatory || "",
    });
  }, [open, renewalDoc, reset]);

 useEffect(() => {
  const current = Number(property?.current_rent || 0);
  const proposed = Number(proposedRent || 0);

  if (current <= 0) {
    setRentChangePercentState("0");
    return;
  }

  const percent = ((proposed - current) / current) * 100;
  setRentChangePercentState(percent.toFixed(2));
}, [proposedRent, property?.current_rent]);

  const applyAction = useCallback((payload: any, options?: any) => {
    if (applyActionRef.current) {
      applyActionRef.current(payload, options);
    } else {
      console.error("Workflow action not available");
    }
  }, []);

  const formatDateForAPI = (date?: string) => {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  };
  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("is_private", "1");
    const res = await fetch("/api/method/upload_file", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const data = await res.json();
    return data.message.file_url as string;
  };


  const validateBeforeWorkflow = () => {
  const values = getValues();

  // Property Dept → Cheque Details
  if (
    isJHPropertyDepartment &&
    renewalDoc?.workflow_state === "Pending Cheque Details"
  ) {
    if (!values.bank_name || !values.cheque_number || !values.cheque_date || !values.payee ||  !values.signatory||  !values.cheque_amount) {
      toast.error("Please fill all cheque details before confirming");
      return false;
    }

    if (Number(values.cheque_amount) <= 0) {
      toast.error("Cheque amount must be greater than 0");
      return false;
    }
  }

  // Property Dept → PO
  if (
    isJHPropertyDepartment &&
    renewalDoc?.workflow_state === "Pending Property PO"
  ) {
    if (!values.po_number) {
      toast.error("PO Number is required before confirming");
      return false;
    }
  }

  // GL Team → MIRO
  if (
    isGLTeam &&
    renewalDoc?.workflow_state === "Pending MIRO"
  ) {
    if (!values.miro_number) {
      toast.error("MIRO Number is required before completing");
      return false;
    }
  }

  return true;
};

  const getSuccessMessage = (state?: string) => {
    switch (state) {
      case "Pending Cheque Details":
        return "Cheque Entry saved successfully";
      case "Pending Property PO":
        return "PO details saved successfully";
      case "Pending MIRO":
        return "MIRO details saved successfully";
      default:
        return "Renewal updated successfully";
    }
  };

  const handleOpenWithdrawModal = (id: string) => {
    setPendingWithdrawalId(id);
    setIsWithdrawModalOpen(true);
  };

  const handleOpenSendBackModal = async (id: string) => {
    try {
      const data = await propertyApi.getAllowedActions(id);
      setSendbackOptions(data?.sendback_options || []);
      setPendingSendBackId(id);
      setIsSendBackModalOpen(true);
    } catch (error) {
      toast.error("Failed to load sendback options");
    }
  };

  const handleSendBackSubmit = (target_state: string, comment: string) => {
    if (!pendingSendBackId) return;

    applyAction(
      {
        renewal_id: pendingSendBackId,
        action: "sendback",
        target_state,
        comment,
      },
      {
        onSuccess: async() => {
          refetchRenewal();
          await queryClient.invalidateQueries({ queryKey: ["renewal", propertyId] });
          toast.success("Renewal sent back successfully");
          setIsSendBackModalOpen(false);
          setPendingSendBackId(null);
          setSendbackOptions([]);
        },
      }
    );
  };

  const handleWithdrawSubmit = (comment: string) => {
    if (!pendingWithdrawalId) return;

    applyAction(
      {
        renewal_id: pendingWithdrawalId,
        action: "withdraw",
        comment,
      },
      {
        onSuccess: async() => {
          await queryClient.invalidateQueries({ queryKey: ["renewal", propertyId] });
          await refetchRenewal();
          refetchRenewal();
          toast.success("Renewal withdrawn successfully");
          setIsWithdrawModalOpen(false);
          setPendingWithdrawalId(null);
          onOpenChange(false);
        },
      }
    );
  };

  

  const onSubmit = async (data: z.infer<typeof renewalSchema>) => {
    try {
      
      const latest = await refetchRenewal();
      const latestDoc = latest.data?.doc;

      if (!latestDoc) {
        toast.error("Failed to fetch latest document");
        return;
      }

      if (localModified && latestDoc.modified !== localModified) {
        toast.error("Document was updated by another user. Reloading latest data...");
        await refetchRenewal();
        return;
      }

      setLocalModified(latestDoc.modified);

      const chequeAmount = Number(getValues("cheque_amount") || 0);
      if (
        isJHPropertyDepartment &&
        renewalDoc?.workflow_state === "Pending Cheque Details" &&
        chequeAmount <= 0
      ) {
        toast.error("Please enter valid Cheque Amount (> 0)");
        return;
      }

      const supportingDocUrl =
        supportingFiles.length > 0
          ? (await Promise.all(supportingFiles.map(uploadFile)))[0]
          : latestDoc.supporting_documents;

      const contractDocUrl =
        contractFiles.length > 0
          ? (await Promise.all(contractFiles.map(uploadFile)))[0]
          : latestDoc.renewed_contract_document;

      const rentPercent = Number(rentChangePercentState) || 0;

      const formChequeData = {
        doctype: "JH Property Cheque Detail",
        bank_name: data.bank_name || "",
        cheque_number: data.cheque_number || "",
        cheque_amount: Number(data.cheque_amount || 0),
        cheque_date: data.cheque_date || "",
        payee: data.payee || "",
        signatory: data.signatory || "",
      };

      let updatedChequeDetails = [...(latestDoc.cheque_details || [])];
      if (formChequeData.cheque_amount > 0) {
        updatedChequeDetails[0] = formChequeData;
      }

      const payload = {
        doctype: "JH Property Rental Renewal",
        name: propertyId,
        division: data.division || "",
        proposed_rent: Number(data.proposed_rent || 0),
        renewal_from: formatDateForAPI(data.renewal_from),
        renewal_to: formatDateForAPI(data.renewal_to),
        additional_charges: Number(data.additional_charges || 0),
        payment_schedule: data.payment_schedule || "",
        new_security_deposit: Number(data.new_security_deposit || 0),
        remarks: data.remarks || "",
        po_number: data.po_number || "",
        miro_number: data.miro_number || "",
        rent_change_percent: rentPercent,
        property: latestDoc.property,
        current_rent: latestDoc.current_rent,
        supporting_documents: supportingDocUrl,
        renewed_contract_document: contractDocUrl,
        cheque_details: updatedChequeDetails,
        flags: {
          ignore_validate_update_after_submit: true,
        },
      };

      await updateDoc.mutateAsync({
        doctype: "JH Property Rental Renewal",
        name: propertyId,
        doc: payload,
      });

      toast.success(getSuccessMessage(latestDoc.workflow_state));

      await queryClient.invalidateQueries({ queryKey: ["RenewalList"] });
      await queryClient.invalidateQueries({ queryKey: ["PendingRenewals"] });

      await refetchRenewal();
      await refetchProperty();

      onOpenChange(false);
      reset();
      setSupportingFiles([]);
      setContractFiles([]);
    } catch (error: any) {
      console.error("Submit ERROR:", error);

      if (error?.message?.includes("modified after")) {
        toast.error("Document updated. Reloading latest data...");
        await refetchRenewal();
        return;
      }

      toast.error(error?.message || "Save failed");
    }
  };

  const getFileName = (url: string) => url.split("/").pop() || "";

  const renderReadonlyField = (
    label: string,
    value?: string | number,
   
  ) => (
    <div className="flex items-center gap-2 py-1 text-sm">
      <span className="font-medium text-gray-600" >
        {label}:
      </span>
      <span>{value}</span>
    </div>
  );

  const renderRenewalField = (
    label: string,
    name: keyof z.infer<typeof renewalSchema>,
    value?: string,
    type = "text"
  ) => {
    return (
      <div>
        {isView ? (
          <div className="flex gap-1">
            <Label className="text-sm text-gray-600">{label}:</Label>
            <span>{value}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <Label className="text-sm text-gray-600">{label}</Label>
            <Controller
              name={name}
              control={control}
              render={({ field }) => (
                <Input
                  type={type}
                  {...field}
                  value={field.value ?? ""}
                  className={errors[name] ? "border-red-500" : ""}
                />
              )}
            />
            {errors[name] && (
              <span className="text-red-500 text-xs">
                {errors[name]?.message as string}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderRenewalRoleField = (
    label: string,
    name: keyof z.infer<typeof renewalSchema>,
    value?: string,
    type = "text"
  ) => {
    return (
      <div className="flex flex-col gap-1">
        <Label className="text-sm text-gray-600">{label}</Label>
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Input
              type={type}
              {...field}
              value={field.value ?? ""}
              className={errors[name] ? "border-red-500" : ""}
            />
          )}
        />
        {errors[name] && (
          <span className="text-red-500 text-xs">
            {errors[name]?.message as string}
          </span>
        )}
      </div>
    );
  };

  if (renewalLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>Loading...</SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-5xl px-5 pb-30">
        <SheetHeader className="flex-row text-2xl justify-between items-center px-0 py-2">
          <SheetTitle>{isEdit ? `Edit Renewal ${propertyId}` : "Renewal Details"}</SheetTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <XIcon className="size-4" />
          </Button>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] pr-3">
          <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <div>
              <h2 className="text-lg font-semibold mb-4">Property Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 rounded-lg">
                {property && (
                  <>
                    {renderReadonlyField("Property Name", property.property_name)}
                    {renderReadonlyField("Division", property.division_used)}
                    {renderReadonlyField("Location", property.location)}
                    {renderReadonlyField("Emirate", property.emirate)}
                    {renderReadonlyField("Landlord", property.landlord)}
                    {renderReadonlyField("Property Type", property.type_of_property)}
                    {renderReadonlyField("Number of Units", property.number_of_units)}
                    {renderReadonlyField("Tenancy Period", property.tenancy_period)}
                    {renderReadonlyField("Current Rent", property.current_rent)}
                  </>
                )}
              </div>
            </div>

            <Separator />

            <h2 className="text-lg font-semibold">Renewal Details</h2>
            <div
              className={`grid items-start gap-4 py-1 ${
                isView
                  ? "grid-cols-1 lg:grid-cols-3"
                  : "grid-cols-1 md:grid-cols-4 lg:grid-cols-5"
              }`}
            >
              {renderRenewalField(
                "Proposed Rent",
                "proposed_rent",
                String(renewalDoc?.proposed_rent ?? ""),
                "number"
              )}
              {renderRenewalField(
                "Additional Charges",
                "additional_charges",
                String(renewalDoc?.additional_charges ?? ""),
                "number"
              )}

              <div className={`${isView ? "flex gap-2" : "flex flex-col gap-1"}`}>
                <Label className="text-gray-600">Rent Change %:</Label>
                {isView ? (
                  <div>{renewalDoc?.rent_change_percent ?? 0}%</div>
                ) : (
                  <Input value={`${rentChangePercentState}%`} readOnly className="bg-gray-200" />
                )}
              </div>

              {renderRenewalField("Renewal From", "renewal_from", renewalDoc?.renewal_from, "date")}
              {renderRenewalField("Renewal To", "renewal_to", renewalDoc?.renewal_to, "date")}
              {renderRenewalField("Payment Schedule", "payment_schedule", renewalDoc?.payment_schedule || "")}
              {renderRenewalField(
                "New Security Deposit",
                "new_security_deposit",
                String(renewalDoc?.new_security_deposit ?? ""),
                "number"
              )}

              <div className={`${isView ? "flex py-1 gap-2" : "flex flex-col gap-1 py-1"}`}>
                <Label className="text-gray-600">Remarks:</Label>
                {isView ? (
                  <div>{renewalDoc?.remarks}</div>
                ) : (
                  <textarea {...register("remarks")} className="border rounded-md p-2 h-20 resize-vertical" />
                )}
              </div>
            </div>

            <div>
  <h3 className="text-md font-semibold mb-2">Supporting Documents</h3>

  {isView ? (
    <div className="space-y-2 mb-10">
      {renewalDoc?.supporting_documents ? (
        <div className="flex items-center gap-2 px-3">
          <span className="text-sm text-gray-700">
            {getFileName(renewalDoc.supporting_documents)}
          </span>
          <a
            href={renewalDoc.supporting_documents}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 text-sm underline"
          >
            View
          </a>
        </div>
      ) : (
        <p className="text-sm text-gray-500">No documents available</p>
      )}
    </div>
  ) : (
    <>
      {renewalDoc?.supporting_documents && (
        <div className="space-y-2 mb-4">
          <p className="text-sm font-medium text-gray-600">Existing File</p>
          <div className="flex items-center gap-2 px-3">
            <span className="text-sm text-gray-700">
              {getFileName(renewalDoc.supporting_documents)}
            </span>
            <a
              href={renewalDoc.supporting_documents}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 text-sm underline"
            >
              View
            </a>
          </div>
        </div>
      )}

      <FileAttachment
        files={supportingFiles}
        setFiles={setSupportingFiles}
      />
    </>
  )}
</div>

            {isJHPropertyDepartment && renewalDoc?.workflow_state === "Pending Cheque Details" && (
              <>
                <Separator />
                <h2 className="text-lg font-semibold">Cheque Details</h2>
                <div className="space-y-4 pb-10">
                  <div className="border p-4 rounded-md space-y-2">
                    {renderRenewalRoleField("Bank Name", "bank_name")}
                    <div className="grid grid-cols-2 gap-2">
                      {renderRenewalRoleField("Cheque Number", "cheque_number")}
                      {renderRenewalRoleField("Amount", "cheque_amount", undefined, "number")}
                    </div>
                    {renderRenewalRoleField("Cheque Date", "cheque_date", undefined, "date")}
                    <div className="grid grid-cols-2 gap-2">
                      {renderRenewalRoleField("Payee", "payee")}
                      {renderRenewalRoleField("Signatory", "signatory")}
                    </div>
                  </div>
                </div>
              </>
            )}

            {isJHPropertyDepartment && renewalDoc?.workflow_state === "Pending Property PO" && (
              <>
                <Separator />
                <h2 className="text-lg font-semibold">PO Details</h2>

                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 items-start gap-4">
                  {renderRenewalRoleField("PO Number", "po_number", renewalDoc?.po_number || "")}
                </div>

                <div className="pb-10">
                  <h3 className="text-md font-semibold mb-2">Renewed Contract Document</h3>
                  {renewalDoc?.renewed_contract_document ? (
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded">
                      <span className="text-sm">
                        {getFileName(renewalDoc.renewed_contract_document)}
                      </span>
                      <a
                        href={renewalDoc.renewed_contract_document}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline text-sm"
                      >
                        View
                      </a>
                    </div>
                  ) : (
                    <p>No document</p>
                  )}
                  <FileAttachment files={contractFiles} setFiles={setContractFiles} />
                </div>
              </>
            )}

            {isGLTeam && renewalDoc?.workflow_state === "Pending MIRO" && (
              <>
                <Separator />
                <h2 className="text-lg font-semibold">Miro Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 items-start gap-4 pb-10">
                  {renderRenewalRoleField("MIRO Number", "miro_number", renewalDoc?.miro_number || "")}
                </div>
              </>
            )}

            {propertyId && mode === "view" && (
              <>
                <RenewalTimeline renewalId={propertyId} defaultOpen={true} />
              </>
            )}
          </form>
        </ScrollArea>

        <SheetFooter className="absolute bottom-0 w-full pr-10 bg-white">
          <div className="flex w-full gap-2">
            {isView && isLicensingTeam && renewalDoc?.workflow_state === "Draft" ? (
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="w-full"
                  type="button"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
                <Button
                  className="w-full bg-primary text-white"
                  type="button"
                  onClick={() => {
                    if (!propertyId) return;
                    applyAction(
                      { renewal_id: propertyId, action: "submit" },
                      {
                        onSuccess: () => {
                          refetchRenewal();
                          queryClient.invalidateQueries({ queryKey: ["RenewalList"] });
                          onOpenChange(false);
                        },
                      }
                    );
                  }}
                >
                  Submit for Head Review
                </Button>
              </div>
            ) : isApprover1 && renewalDoc?.workflow_state === "Pending Approver 1" && isView ? (
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="w-full"
                  type="button"
                  title="Closes the renewal process entirely. If needed, initiators can duplicate or create a new process for that property."
                  onClick={() => propertyId && handleOpenWithdrawModal(propertyId)}
                >
                  Withdraw
                </Button>
                <Button
                  className="w-full bg-rose-200 hover:bg-rose-100 text-gray-400"
                  type="button"
                  onClick={() => propertyId && handleOpenSendBackModal(propertyId)}
                >
                  Send Back
                </Button>
                <Button
                  className="w-full bg-primary text-white"
                  type="button"
                  onClick={() => {
                    if (!propertyId) return;
                    applyAction(
                      { renewal_id: propertyId, action: "approve" },
                      {
                        onSuccess: () => {
                          refetchRenewal();
                          queryClient.invalidateQueries({ queryKey: ["RenewalList"] });
                          onOpenChange(false);
                        },
                      }
                    );
                  }}
                >
                  Submit for GM Review
                </Button>
              </div>
            ) : isApprover2 && renewalDoc?.workflow_state === "Pending Approver 2" && isView ? (
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="w-full"
                  type="button"
                  title="Closes the renewal process entirely. If needed, initiators can duplicate or create a new process for that property."
                  onClick={() => propertyId && handleOpenWithdrawModal(propertyId)}
                >
                  Withdraw
                </Button>
                <Button
                  className="w-full bg-rose-200 hover:bg-rose-100 text-gray-400"
                  type="button"
                  onClick={() => propertyId && handleOpenSendBackModal(propertyId)}
                >
                  Send Back
                </Button>
                <Button
                  className="w-full bg-primary text-white"
                  type="button"
                  onClick={() => {
                    if (!propertyId) return;
                    applyAction(
                      { renewal_id: propertyId, action: "approve" },
                      {
                        onSuccess: () => {
                          refetchRenewal();
                          queryClient.invalidateQueries({ queryKey: ["RenewalList"] });
                          onOpenChange(false);
                        },
                      }
                    );
                  }}
                >
                  Submit for CFO
                </Button>
              </div>
            ) : isCfo && renewalDoc?.workflow_state === "Pending CFO" && isView ? (
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="w-full"
                  type="button"
                  title="Closes the renewal process entirely. If needed, initiators can duplicate or create a new process for that property."
                  onClick={() => propertyId && handleOpenWithdrawModal(propertyId)}
                >
                  Withdraw
                </Button>
                <Button
                  className="w-full bg-rose-200 hover:bg-rose-100 text-gray-400"
                  type="button"
                  onClick={() => propertyId && handleOpenSendBackModal(propertyId)}
                >
                  Send Back
                </Button>
                <Button
                  className="w-full bg-primary text-white"
                  type="button"
                  onClick={() => {
                    if (!propertyId) return;
                    applyAction(
                      { renewal_id: propertyId, action: "approve" },
                      {
                        onSuccess: () => {
                          refetchRenewal();
                          queryClient.invalidateQueries({ queryKey: ["RenewalList"] });
                          onOpenChange(false);
                        },
                      }
                    );
                  }}
                >
                  Submit to MD / complete
                </Button>
              </div>
            ) : isMD && renewalDoc?.workflow_state === "Pending MD" && isView ? (
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="w-full"
                  type="button"
                  title="Closes the renewal process entirely. If needed, initiators can duplicate or create a new process for that property."
                  onClick={() => propertyId && handleOpenWithdrawModal(propertyId)}
                >
                  Withdraw
                </Button>
                <Button
                  className="w-full bg-rose-200 hover:bg-rose-100 text-gray-400"
                  type="button"
                  onClick={() => propertyId && handleOpenSendBackModal(propertyId)}
                >
                  Send Back
                </Button>
                <Button
                  className="w-full bg-primary text-white"
                  type="button"
                  onClick={() => {
                    if (!propertyId) return;
                    applyAction(
                      { renewal_id: propertyId, action: "approve" },
                      {
                        onSuccess: () => {
                          refetchRenewal();
                          queryClient.invalidateQueries({ queryKey: ["RenewalList"] });
                          onOpenChange(false);
                        },
                      }
                    );
                  }}
                >
                  Approve
                </Button>
              </div>
            ) : isJHPropertyDepartment && renewalDoc?.workflow_state === "Pending Cheque Details" && isView ? (
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="w-full" type="button" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button
                  className="w-full bg-rose-200 hover:bg-rose-100 text-gray-400"
                  type="submit"
                  form={formId}
                  disabled={
                    isSubmitting ||
                    !isValid ||
                    (localModified && renewalDoc?.modified && localModified !== renewalDoc.modified)
                  }
                  title={
                    localModified && renewalDoc?.modified && localModified !== renewalDoc.modified
                      ? "Document modified externally - refresh first"
                      : ""
                  }
                >
                  {isSubmitting ? "Saving..." : "Save Cheque Entry"}
                </Button>
                <Button
                  className="w-full bg-primary text-white"
                  type="button"
                  onClick={() => {
                    if (!propertyId) return;
                    if (!validateBeforeWorkflow()) return;
                    applyAction(
                      { renewal_id: propertyId, action: "approve" },
                      {
                        onSuccess: () => {
                          refetchRenewal();
                          queryClient.invalidateQueries({ queryKey: ["RenewalList"] });
                          onOpenChange(false);
                        },
                      }
                    );
                  }}
                >
                  Confirm Cheque Entry
                </Button>
              </div>
            ) : isJHPropertyDepartment && renewalDoc?.workflow_state === "Pending Property PO" && isView ? (
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="w-full" type="button" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button
                  className="w-full bg-rose-200 hover:bg-rose-100 text-gray-400"
                  type="submit"
                  form={formId}
                  disabled={
                    isSubmitting ||
                    !isValid ||
                    (localModified && renewalDoc?.modified && localModified !== renewalDoc.modified)
                  }
                  title={
                    localModified && renewalDoc?.modified && localModified !== renewalDoc.modified
                      ? "Document modified externally - refresh first"
                      : ""
                  }
                >
                  {isSubmitting ? "Saving..." : "Save PO"}
                </Button>
                <Button
                  className="w-full bg-primary text-white"
                  type="button"
                  onClick={() => {
                    if (!propertyId) return;
                     if (!validateBeforeWorkflow()) return;
                    applyAction(
                      { renewal_id: propertyId, action: "approve" },
                      {
                        onSuccess: () => {
                          refetchRenewal();
                          queryClient.invalidateQueries({ queryKey: ["RenewalList"] });
                          onOpenChange(false);
                        },
                      }
                    );
                  }}
                >
                  Confirm PO
                </Button>
              </div>
            ) : isGLTeam && renewalDoc?.workflow_state === "Pending MIRO" && isView ? (
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="w-full" type="button" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button
                  className="w-full bg-rose-200 hover:bg-rose-100 text-gray-400"
                  type="submit"
                  form={formId}
                  disabled={
                    isSubmitting ||
                    !isValid ||
                    (localModified && renewalDoc?.modified && localModified !== renewalDoc.modified)
                  }
                  title={
                    localModified && renewalDoc?.modified && localModified !== renewalDoc.modified
                      ? "Document modified externally - refresh first"
                      : ""
                  }
                >
                  {isSubmitting ? "Saving..." : "Save MIRO Details"}
                </Button>
                <Button
                  className="w-full bg-primary text-white"
                  type="button"
                  onClick={() => {
                    if (!propertyId) return;
                     if (!validateBeforeWorkflow()) return;
                    applyAction(
                      { renewal_id: propertyId, action: "approve" },
                      {
                        onSuccess: () => {
                          refetchRenewal();
                          queryClient.invalidateQueries({ queryKey: ["RenewalList"] });
                          onOpenChange(false);
                        },
                      }
                    );
                  }}
                >
                  Mark Complete
                </Button>
              </div>
            ) : !isView ? (
              <>
                <Button variant="outline" className="w-full" type="button" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button
                  type="submit"
                  form={formId}
                  disabled={renewalDoc?.workflow_state !== "Draft"}
                  className="w-full bg-[#972e26] hover:bg-[#972e26]/90"
                >
                  Update Renewal
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="w-full" type="button" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        </SheetFooter>
      </SheetContent>

      <WithdrawCommentModal
        open={isWithdrawModalOpen}
        onOpenChange={setIsWithdrawModalOpen}
        onWithdraw={handleWithdrawSubmit}
        propertyId={pendingWithdrawalId}
      />

      <SendBackModal
        open={isSendBackModalOpen}
        onOpenChange={setIsSendBackModalOpen}
        sendback_options={sendbackOptions}
        onSendBack={handleSendBackSubmit}
        renewalId={pendingSendBackId || ""}
        title={`Send Back ${renewalDoc?.name || ""}`}
      />
    </Sheet>
  );
}