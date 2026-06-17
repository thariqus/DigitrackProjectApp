import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RenewalTimeline from "./RenewalTimeline";
import WithdrawCommentModal from "./WithdrawCommentModal";
import SendBackModal from "./SendBackModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { XIcon } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import FileAttachment from "./FileAttachment";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateDoc, useDocs } from "@/hooks/doc";
import { useCurrentUser } from "@/hooks/auth";
import { useEffect, useState } from "react";
import { PropertyMaster, RentalRenewal } from "@/types/JHDigitrack/JHPropertyAutomation";
import { usePropertyDoc, useRenewalDoc, useRenewalRole, useBankAccounts } from "../hooks/useProperty";
import { propertyApi, type RenewalProgressPayload } from "../api/property";
import { useApplyWorkflowAction } from "../hooks/useApplyWorkflowAction";
import { useCreateDelegation, useDocumentDelegation, useRevokeDelegation } from "../hooks/useDelegation";
import { RenewalDelegationModal } from "./RenewalDelegationModal";
import ApprovalCommentModal from "./ApprovalCommentModal";
import RenewalApprovalFooter from "./RenewalApprovalFooter";

 
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
  proposed_rent: z.coerce.number().min(1, "Proposed rent is required"),
  renewal_from: z.string().min(1, "Renewal from date is required"),
  renewal_to: z.string().min(1, "Renewal to date is required"),
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
  cheque_details: z.array(z.object({
    bank_name: z.string().optional(),
    cheque_number: z.string().optional(),
    cheque_amount: z.coerce.number().optional(),
    cheque_date: z.string().optional(),
    payee: z.string().optional(),
    signatory: z.string().optional(),
  })).optional(),
});
 
type RenewalFormValues = z.infer<typeof renewalSchema>;
 
export default function RenewalSheet({
  open,
  onOpenChange,
  propertyId,
  mode,
  isJHPropertyDepartment,
  isGLTeam,
}: RenewalSheetProps) {
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);
  const [contractFiles, setContractFiles] = useState<File[]>([]);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isSendBackModalOpen, setIsSendBackModalOpen] = useState(false);
  const [pendingWithdrawalId, setPendingWithdrawalId] = useState<string | null>(null);
  const [pendingSendBackId, setPendingSendBackId] = useState<string | null>(null);
  const [sendbackOptions, setSendbackOptions] = useState<string[]>([]);
  const [rentChangePercentState, setRentChangePercentState] = useState("0");
  const [localModified, setLocalModified] = useState<string>("");
  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);
  const [chequeDetails, setChequeDetails] = useState<NonNullable<RentalRenewal["cheque_details"]>>([]);
const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [pendingApprovalAction, setPendingApprovalAction] = useState<"approve" | "submit" | "reject">("approve");
  const [approvalTitle, setApprovalTitle] = useState("Approval Action");
  const [approvalDescription, setApprovalDescription] = useState("Please provide justification or notes.");
 
  const queryClient = useQueryClient();
  const updateDoc = useUpdateDoc();
 
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const formId = "renewal-form";
  const workflowMutation = useApplyWorkflowAction();
  const applyAction = workflowMutation.mutate;
 
  const { data: currentUser, isLoading: isCurrentUserLoading } = useCurrentUser();
  const currentUserId = currentUser || undefined;
 
  const { data: usersData = [], isLoading: isUsersLoading } = useDocs<{ name: string; full_name?: string; email?: string }>({
    doctype: "User",
    fields: ["name", "full_name", "email"],
    limit: 500,
  });
 
  const {
    data: activeDelegation,
    isLoading: isDelegationLoading,
    refetch: refetchDelegation,
  } = useDocumentDelegation(
    propertyId ? "JH Property Rental Renewal" : undefined,
    propertyId || undefined,
  );
 
  const createDelegationMutation = useCreateDelegation({
    onClose: () => setIsDelegateModalOpen(false),
  });
 
  const revokeDelegationMutation = useRevokeDelegation({
    onSuccess: () => {
      refetchDelegation();
      refetchRenewal();
      queryClient.invalidateQueries({ queryKey: ["RenewalList"] });
      queryClient.invalidateQueries({ queryKey: ["PendingRenewals"] });
    },
  });
 
  const { data: renewalData, isLoading: renewalLoading, refetch: refetchRenewal } =
    useRenewalDoc(propertyId || undefined);
 
  const { data: renewalRoleData } = useRenewalRole(propertyId || undefined);
 
  const effectiveRole = renewalRoleData?.role;
  const isActingAsDelegate = !!renewalRoleData?.on_behalf_of;
  const effectiveIsPropertyDept = effectiveRole === "property_dept";
  const effectiveIsGLTeam = effectiveRole === "gl_team";
  const allowedWorkflowActions = renewalRoleData?.actions ?? [];
  const canSubmitWorkflow = allowedWorkflowActions.includes("submit");
  const canApproveWorkflow = allowedWorkflowActions.includes("approve");
  const canSendBackWorkflow = allowedWorkflowActions.includes("sendback");
  const canWithdrawWorkflow = allowedWorkflowActions.includes("withdraw");
 
  const renewalDoc = renewalData?.doc as RentalRenewal | undefined;
 
  const { data: propertyData, refetch: refetchProperty } = usePropertyDoc(
    renewalDoc?.property
  );
  const property = propertyData?.doc as PropertyMaster | undefined;
  const { data: bankAccounts = [] } = useBankAccounts();
  const hasExternalModification = Boolean(
    localModified && renewalDoc?.modified && localModified !== renewalDoc.modified
  );
 
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting, isValid },
    getValues,
  } = useForm({
    resolver: zodResolver(renewalSchema),
    mode: "onChange",
  });
 
  const proposedRent = useWatch({ control, name: "proposed_rent" }) || 0;
 
  useEffect(() => {
    if (open) {
      setSupportingFiles([]);
      setChequeDetails([]);
    }
  }, [open]);
 
  useEffect(() => {
    if (!open || !renewalDoc) return;
 
    setLocalModified(renewalDoc.modified || "");
    setChequeDetails(renewalDoc.cheque_details || []);

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
      cheque_details: renewalDoc.cheque_details || [],
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
 
  const formatDateForAPI = (date?: string) => {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  };
  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("is_private", "1");
    const csrfToken =
      (window as { frappe?: { csrf_token?: string }; csrf_token?: string })?.frappe
        ?.csrf_token ||
      (window as { frappe?: { csrf_token?: string }; csrf_token?: string })?.csrf_token ||
      "";
 
    const res = await fetch("/api/method/upload_file", {
      method: "POST",
      body: formData,
      credentials: "include",
      headers: csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : undefined,
    });
 
    const data = await res.json();
    if (!res.ok || !data?.message?.file_url) {
      throw new Error(getUploadErrorMessage(data));
    }
 
    return data.message.file_url as string;
  };
 
 
  const validateBeforeWorkflow = () => {
  const values = getValues();
 
  // Property Dept → Cheque Details
  if (
    (isJHPropertyDepartment || effectiveIsPropertyDept) &&
    renewalDoc?.workflow_state === "Pending Cheque Details"
  ) {
    const validCheques = chequeDetails.filter((cheque) =>
      cheque.bank_name &&
      cheque.cheque_number &&
      cheque.cheque_date &&
      cheque.payee &&
      cheque.signatory &&
      Number(cheque.cheque_amount || 0) > 0
    );

    if (validCheques.length === 0) {
      toast.error("Please fill all cheque details before confirming");
      return false;
    }

    if (validCheques.length !== chequeDetails.length) {
      toast.error("Please complete every cheque row before confirming");
      return false;
    }
 
  }
 
  // Property Dept → PO
  if (
    (isJHPropertyDepartment || effectiveIsPropertyDept) &&
    renewalDoc?.workflow_state === "Pending Property PO"
  ) {
    if (!values.po_number) {
      toast.error("PO Number is required before confirming");
      return false;
    }
    if (values.po_number.length !== 10) {
      toast.error("Enter valid PO Number");
      return false;
    }
    const hasContractDoc = contractFiles.length > 0 || !!renewalDoc?.renewed_contract_document;
    if (!hasContractDoc) {
      toast.error("Renewed Contract Document is required before confirming");
      return false;
    }
  }
 
  // GL Team → MIRO
  if (
    (isGLTeam || effectiveIsGLTeam) &&
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
 
  const isWorkflowProgressState = (state?: string) =>
    state === "Pending Cheque Details" ||
    state === "Pending Property PO" ||
    state === "Pending MIRO";
 
  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;
 
  const getUploadErrorMessage = (payload: unknown) => {
    if (payload && typeof payload === "object") {
      const errorPayload = payload as {
        message?: string;
        _server_messages?: string;
        exc?: string;
      };
 
      if (errorPayload.message) {
        return errorPayload.message;
      }
 
      if (errorPayload._server_messages) {
        try {
          const serverMessages = JSON.parse(errorPayload._server_messages) as string[];
          const firstMessage = serverMessages[0];
          if (firstMessage) {
            try {
              const parsedMessage = JSON.parse(firstMessage) as { message?: string };
              if (parsedMessage.message) {
                return parsedMessage.message;
              }
            } catch {
              return firstMessage;
            }
          }
        } catch {
          return errorPayload._server_messages;
        }
      }
 
      if (errorPayload.exc) {
        return errorPayload.exc;
      }
    }
 
    return "File upload failed";
  };
 
  const saveWorkflowProgress = async (data: RenewalFormValues) => {
    if (!propertyId) {
      throw new Error("Renewal ID is missing");
    }
 
    const latest = await refetchRenewal();
    const latestDoc = latest.data?.doc as RentalRenewal | undefined;
 
    if (!latestDoc) {
      throw new Error("Failed to fetch latest document");
    }
 
    if (localModified && latestDoc.modified !== localModified) {
      throw new Error("Document was updated by another user. Reloading latest data...");
    }
 
    const currentState = latestDoc.workflow_state;
    const payload: RenewalProgressPayload = {
      renewal_id: propertyId,
    };
 
    if (currentState === "Pending Cheque Details") {
     payload.cheque_details = chequeDetails
  .filter((cheque) =>
    cheque.bank_name &&
    cheque.cheque_number &&
    cheque.cheque_date &&
    cheque.payee &&
    cheque.signatory &&
    Number(cheque.cheque_amount || 0) > 0
  )
  .map((cheque) => ({
    bank_name: cheque.bank_name,
    cheque_number: cheque.cheque_number,
    cheque_amount: Number(cheque.cheque_amount),
    cheque_date: cheque.cheque_date,
    payee: cheque.payee,
    signatory: cheque.signatory,
  }));
    }
 
    if (currentState === "Pending Property PO") {
      const contractDocUrl =
        contractFiles.length > 0
          ? (await Promise.all(contractFiles.map(uploadFile)))[0]
          : latestDoc.renewed_contract_document || "";
 
      payload.po_number = data.po_number || "";
      payload.renewed_contract_document = contractDocUrl;
    }
 
    if (currentState === "Pending MIRO") {
      payload.miro_number = data.miro_number || "";
    }
 
    if (!isWorkflowProgressState(currentState)) {
      throw new Error("This renewal stage does not support progress save");
    }
 
    const savedDoc = await propertyApi.saveRenewalProgress(payload);
    if (currentState === "Pending Property PO") {
      setContractFiles([]);
    }
    setLocalModified(savedDoc?.modified || latestDoc.modified || "");
 
    return { latestDoc, savedDoc };
  };
 
  const handleWorkflowConfirm = handleSubmit(async (data) => {
    if (!propertyId) return;
    if (!validateBeforeWorkflow()) return;
 
    try {
      const { latestDoc } = await saveWorkflowProgress(data);
      handleOpenApprovalModal("approve");
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Failed to save renewal progress");
 
      if (message.includes("updated by another user")) {
        await refetchRenewal();
      }
 
      toast.error(message);
    }
  });
 
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
    } catch {
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
        expected_state: renewalDoc?.workflow_state,
      },
      {
        onSuccess: async() => {
          await queryClient.invalidateQueries({ queryKey: ["RenewalDoc", pendingSendBackId] });
          await queryClient.invalidateQueries({ queryKey: ["RenewalList"] });
          await queryClient.invalidateQueries({ queryKey: ["PendingRenewals"] });
          await refetchRenewal();
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
        expected_state: renewalDoc?.workflow_state,
      },
      {
        onSuccess: async() => {
          await queryClient.invalidateQueries({ queryKey: ["RenewalDoc", pendingWithdrawalId] });
          await queryClient.invalidateQueries({ queryKey: ["RenewalList"] });
          await queryClient.invalidateQueries({ queryKey: ["PendingRenewals"] });
          await refetchRenewal();
          toast.success("Renewal withdrawn successfully");
          setIsWithdrawModalOpen(false);
          setPendingWithdrawalId(null);
          onOpenChange(false);
        },
      }
    );
  };
 
  const handleDelegate = (values: { delegate: string; comment: string }) => {
    if (!propertyId) return;
    createDelegationMutation.mutate(
      {
        delegate: values.delegate,
        delegation_type: "Ad-Hoc",
        reference_doctype: "JH Property Rental Renewal",
        reference_name: propertyId,
        comment: values.comment,
      },
      {
        onSuccess: () => {
          refetchDelegation();
          refetchRenewal();
          queryClient.invalidateQueries({ queryKey: ["RenewalList"] });
          queryClient.invalidateQueries({ queryKey: ["PendingRenewals"] });
        },
      }
    );
  };
 
  const handleOpenApprovalModal = (action: "approve" | "submit" | "reject", title?: string, description?: string) => {
    if (!propertyId) return;
    setPendingApprovalAction(action);
    setApprovalTitle(title || "Approval Action");
    setApprovalDescription(description || "Please provide justification or notes.");
    setIsApprovalModalOpen(true);
  };
 
  const handleApprovalSubmit = (action: string, comment: string) => {
    if (!propertyId) return;
 
    applyAction(
      {
        renewal_id: propertyId,
        action,
        comment,
        expected_state: renewalDoc?.workflow_state,
      },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: ["RenewalList"] });
          await queryClient.invalidateQueries({ queryKey: ["PendingRenewals"] });
          await refetchRenewal();
          setIsApprovalModalOpen(false);
          toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)}d successfully`);
          if (["approve", "submit"].includes(action)) {
            onOpenChange(false);
          }
        },
        onError: (error: unknown) => {
          toast.error(error instanceof Error ? error.message : "Action failed");
        },
      }
    );
  };
 
  const renderDelegateBadge = () => {
  if (!isActingAsDelegate) return null;
  return (
    <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
      Acting on behalf of {renewalRoleData?.on_behalf_of}
    </Badge>
  );
};
 
const renderDelegationBadge = () => {
  if (isDelegationLoading || !activeDelegation) return null;
 
  return (
    <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
      Delegation Active: {activeDelegation.delegate_name || activeDelegation.delegate}
    </Badge>
  );
};
 
  const handleRevoke = () => {
    if (!activeDelegation?.name) return;
    revokeDelegationMutation.mutate(activeDelegation.name);
  };
 
  const renderDelegationActionButton = () => {
    if (isActingAsDelegate) return null;
 
    if (activeDelegation) {
      return (
        <Button
          className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200"
          type="button"
          disabled={revokeDelegationMutation.isPending}
          onClick={handleRevoke}
        >
          {revokeDelegationMutation.isPending ? "Revoking..." : "Revoke"}
        </Button>
      );
    }
 
    return (
      <Button
        className="w-full bg-gray-200 text-gray-700 hover:bg-gray-300"
        type="button"
        disabled={isDelegationLoading}
        onClick={() => setIsDelegateModalOpen(true)}
      >
        Delegate
      </Button>
    );
  };
 
  
 
  const onSubmit = async (data: RenewalFormValues) => {
    if (!propertyId) return;
 
    try {
      if (isWorkflowProgressState(renewalDoc?.workflow_state)) {
        const { latestDoc } = await saveWorkflowProgress(data);
 
        toast.success(getSuccessMessage(latestDoc.workflow_state));
 
        await queryClient.invalidateQueries({ queryKey: ["RenewalList"] });
        await queryClient.invalidateQueries({ queryKey: ["PendingRenewals"] });
 
        await refetchRenewal();
        await refetchProperty();
 
        onOpenChange(false);
        reset();
        setSupportingFiles([]);
        setContractFiles([]);
        return;
      }
 
      
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
 
      const supportingDocUrl =
        supportingFiles.length > 0
          ? (await Promise.all(supportingFiles.map(uploadFile)))[0]
          : latestDoc.supporting_documents;
 
      const contractDocUrl =
        contractFiles.length > 0
          ? (await Promise.all(contractFiles.map(uploadFile)))[0]
          : latestDoc.renewed_contract_document;
 
      const rentPercent = Number(rentChangePercentState) || 0;
 
      const updatedChequeDetails = chequeDetails.map((cheque, index) => ({
        doctype: "JH Property Cheque Detail",
        ...cheque,
        cheque_amount: Number(cheque.cheque_amount || 0),
        idx: index + 1,
      }));
 
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
    } catch (error: unknown) {
      console.error("Submit ERROR:", error);
      const message = getErrorMessage(error, "Save failed");
 
      if (message.includes("modified after")) {
        toast.error("Document updated. Reloading latest data...");
        await refetchRenewal();
        return;
      }
 
      toast.error(message);
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
    type = "text",
    required = false
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
            <Label className="text-sm text-gray-600">
              {label}
              {required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
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
    _value?: string,
    type = "text"
  ) => {
    return (
      <div className="flex flex-col gap-1">
        <Label className="text-sm text-gray-600">
          {label}
          <span className="text-red-500 ml-0.5">*</span>
        </Label>
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
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Renewal Details</SheetTitle>
            <SheetDescription className="sr-only">
              Loading property renewal details.
            </SheetDescription>
          </SheetHeader>
          Loading...
        </SheetContent>
      </Sheet>
    );
  }
 
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-5xl px-5 pb-30">
        <SheetHeader className="flex-row text-2xl justify-between items-center px-0 py-2">
          <div className="flex items-center gap-3">
            <SheetTitle>{isEdit ? `Edit Renewal ${propertyId}` : "Renewal Details"}</SheetTitle>
            <SheetDescription className="sr-only">
              View renewal information and complete permitted workflow actions.
            </SheetDescription>
            {renderDelegateBadge()}
            {renderDelegationBadge()}
          </div>
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
                "number",
                true
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
 
              {renderRenewalField("Renewal From", "renewal_from", renewalDoc?.renewal_from, "date", true)}
              {renderRenewalField("Renewal To", "renewal_to", renewalDoc?.renewal_to, "date", true)}
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
 
            {(isJHPropertyDepartment || effectiveIsPropertyDept) && renewalDoc?.workflow_state === "Pending Cheque Details" && (
              <>
                <Separator />
                <h2 className="text-lg font-semibold">Cheque Details</h2>
                <div className="space-y-4 pb-10">
                  {chequeDetails.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3 border-2 border-dashed rounded-lg text-center">
                      Click + Add Cheque to start
                    </p>
                  ) : (
                    chequeDetails.map((cheque, index) => (
                      <div className="flex gap-2 items-end bg-muted p-3 rounded-lg">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs">Bank Name</Label>
                            <Select
                              value={cheque.bank_name || ""}
                              onValueChange={(value) => {
                                const next = [...chequeDetails];
                                next[index].bank_name = value;
                                setChequeDetails(next);
                              }}
                            >
                              <SelectTrigger className="text-sm h-9">
                                <SelectValue placeholder="Select bank..." />
                              </SelectTrigger>
                              <SelectContent>
                                {bankAccounts.map((name) => (
                                  <SelectItem className="cursor-pointer" key={name} value={name}>{name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {(["cheque_number", "cheque_amount", "cheque_date", "payee", "signatory"] as const).map((fieldName) => (
                            <div key={fieldName} className="flex flex-col gap-1">
                              <Label className="text-xs">
                                {fieldName === "cheque_number" ? "Cheque Number" : fieldName === "cheque_amount" ? "Amount" : fieldName === "cheque_date" ? "Cheque Date" : fieldName === "payee" ? "Payee" : "Signatory"}
                              </Label>
                              <Input
                                type={fieldName === "cheque_amount" ? "number" : fieldName === "cheque_date" ? "date" : "text"}
                                value={cheque[fieldName] || ""}
                                onChange={(e) => {
                                  const next = [...chequeDetails];
                                  next[index] = {
                                    ...next[index],
                                    [fieldName]: fieldName === "cheque_amount" ? Number(e.target.value || 0) : e.target.value,
                                  };
                                  setChequeDetails(next);
                                }}
                                className="text-sm"
                              />
                            </div>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 p-0 -mr-2"
                          onClick={() => setChequeDetails(chequeDetails.filter((_, i) => i !== index))}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-2 border-dashed h-10 text-sm"
                    onClick={() => setChequeDetails([...chequeDetails, { bank_name: "", cheque_number: "", cheque_amount: 0, cheque_date: "", payee: "", signatory: "" }])}
                  >
                    + Add Cheque
                  </Button>
                </div>
              </>
            )}
 
            {(isJHPropertyDepartment || effectiveIsPropertyDept) && renewalDoc?.workflow_state === "Pending Property PO" && (
              <>
                <Separator />
                <h2 className="text-lg font-semibold">PO Details</h2>
 
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 items-start gap-2">
                  {renderRenewalRoleField("PO Number", "po_number", renewalDoc?.po_number || "")}
                </div>
 
                <div className="pb-10">
                  <h3 className="text-sm text-gray-600 mb-2 font-semibold">Renewed Contract Document</h3>
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
                    <p className="text-sm">No document</p>
                  )}
                  <FileAttachment files={contractFiles} setFiles={setContractFiles} />
                </div>
              </>
            )}
 
            {(isGLTeam || effectiveIsGLTeam) && renewalDoc?.workflow_state === "Pending MIRO" && (
              <>
                <Separator />
                <h2 className="text-lg font-semibold">Miro Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 items-start gap-4 ">
                  {renderRenewalRoleField("MIRO Number", "miro_number", renewalDoc?.miro_number || "")}
                </div>
              </>
            )}
 
            {propertyId && mode === "view" && (
              <>
                <RenewalTimeline renewalId={propertyId} defaultOpen={true} title="Timeline"/>
              </>
            )}
          </form>
        </ScrollArea>
 
      <SheetFooter className="absolute bottom-0 w-full pr-10 bg-white">
          <div className="flex w-full gap-2 items-center">
            {(isView && canSubmitWorkflow && renewalDoc?.workflow_state === "Draft") ? (
              <div className="flex gap-3 w-full">
                  <Button
                    variant="outline"
                    className="w-full"
                    type="button"
                    onClick={() => onOpenChange(false)}
                  >
                    Close
                  </Button>
                  {renderDelegationActionButton()}
                  <Button
                    className="w-full bg-primary text-white"
                    type="button"
                    onClick={() => handleOpenApprovalModal("submit", "Submit Renewal", "Please provide justification for submitting this renewal for approval.")}
                  >
                   Submit for Approver
                  </Button>
                </div>
            ) : (canApproveWorkflow &&
  [
    "Pending Approver 1",
    "Pending Approver 2",
    "Pending Approver 3",
    "Pending Admin HOD",
    "Pending FC",
    "Pending CFO",
    "Pending MD",
  ].includes(renewalDoc?.workflow_state || "") &&
  isView) ? (
  <RenewalApprovalFooter
    disabledWithdraw={!canWithdrawWorkflow}
    disabledSendBack={!canSendBackWorkflow}
    renderDelegationActionButton={renderDelegationActionButton}
    onWithdraw={() => propertyId && handleOpenWithdrawModal(propertyId)}
    onSendBack={() => propertyId && handleOpenSendBackModal(propertyId)}
    approveButton={{
      title: `Approve Renewal (${renewalDoc?.workflow_state?.replace(
        "Pending ",
        ""
      )})`,
      description: `Please provide your approval justification or notes for ${
        renewalDoc?.workflow_state?.replace("Pending ", "")
      }.`,
      onApprove: () =>
        handleOpenApprovalModal(
          "approve",
          `Approve Renewal (${renewalDoc?.workflow_state?.replace(
            "Pending ",
            ""
          )})`,
          `Please provide your approval justification or notes for ${
            renewalDoc?.workflow_state?.replace("Pending ", "")
          }.`
        ),
    }}
  />
) : (canApproveWorkflow && renewalDoc?.workflow_state === "Pending Cheque Details" && isView) ? (
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
                      hasExternalModification
                    }
                    title={
                      hasExternalModification
                        ? "Document modified externally - refresh first"
                        : ""
                    }
                  >
                    {isSubmitting ? "Saving..." : "Save Cheque Entry"}
                  </Button>
                  {renderDelegationActionButton()}
                  <Button
                    className="w-full bg-primary text-white"
                    type="button"
                    onClick={handleWorkflowConfirm}
                  >
                    Confirm Cheque Entry
                  </Button>
                </div>
            ) : (canApproveWorkflow && renewalDoc?.workflow_state === "Pending Property PO" && isView) ? (
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
                      hasExternalModification
                    }
                    title={
                      hasExternalModification
                        ? "Document modified externally - refresh first"
                        : ""
                    }
                  >
                    {isSubmitting ? "Saving..." : "Save PO"}
                  </Button>
                  {renderDelegationActionButton()}
                  <Button
                    className="w-full bg-primary text-white"
                    type="button"
                    onClick={handleWorkflowConfirm}
                  >
                    Confirm PO
                  </Button>
                </div>
            ) : (canApproveWorkflow && renewalDoc?.workflow_state === "Pending MIRO" && isView) ? (
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
                      hasExternalModification
                    }
                    title={
                      hasExternalModification
                        ? "Document modified externally - refresh first"
                        : ""
                    }
                  >
                    {isSubmitting ? "Saving..." : "Save MIRO Details"}
                  </Button>
                  {renderDelegationActionButton()}
                  <Button
                    className="w-full bg-primary text-white"
                    type="button"
                    onClick={handleWorkflowConfirm}
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
 
      <ApprovalCommentModal
        open={isApprovalModalOpen}
        onOpenChange={setIsApprovalModalOpen}
        onApprove={handleApprovalSubmit}
        renewalId={propertyId || ""}
        title={approvalTitle}
        action={pendingApprovalAction}
        description={approvalDescription}
      />
      <RenewalDelegationModal
        open={isDelegateModalOpen}
        onOpenChange={setIsDelegateModalOpen}
        usersData={usersData}
        currentUserId={currentUserId}
        isUsersLoading={isUsersLoading || isCurrentUserLoading}
        onDelegate={handleDelegate}
        isSubmitting={createDelegationMutation.isPending}
      />
    </Sheet>
  );
}