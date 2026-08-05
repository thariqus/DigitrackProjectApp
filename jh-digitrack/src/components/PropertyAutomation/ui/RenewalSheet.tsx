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
import { Fragment, useEffect, useState } from "react";
import { PropertyMaster, RentalRenewal } from "@/types/JHDigitrack/JHPropertyAutomation";
import { usePropertyDoc, useRenewalDoc, useRenewalRole, useChequeTypes, usePaymentScheduleOptions } from "../hooks/useProperty";
import { propertyApi, type RenewalProgressPayload } from "../api/property";
import { useApplyWorkflowAction } from "../hooks/useApplyWorkflowAction";
import { useCreateDelegation, useDocumentDelegation } from "../hooks/useDelegation";
import { RenewalDelegationModal } from "./RenewalDelegationModal";
import ApprovalCommentModal from "./ApprovalCommentModal";
import { AdditionalChargeEntry } from "./StartRenewalModal";
import RenewalApprovalFooter from "./RenewalApprovalFooter";

 
type RenewalSheetProps = {
  handleDownload: (name: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string | null;
  mode: "view" | "edit" | "create";
  // formatDate: (date?: string) => string;
  // workflowColorHighlight?: (date?: string) => string;
  // typeOptions?: string[];
  // isLicensingTeam: boolean;
  isJHPropertyDepartment: boolean;
  // isCfo: boolean;
  // isGMTeam: boolean;
  // isMD: boolean;
  // isApprover: boolean;
  isGLTeam: boolean;
  // isApprover1: boolean;
  // isApprover2: boolean;
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
  cheque_details: z.array(z.object({
    cheque_type: z.string().optional(),
    cheque_amount: z.coerce.number().optional(),
    cheque_date: z.string().optional(),
    payee: z.string().optional(),
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
  const [chequeAmountErrors, setChequeAmountErrors] = useState<Record<number, string>>({});
  const [miroNumbers, setMiroNumbers] = useState<string[]>([]);
  const [particulars, setParticulars] = useState<{ label: string; amount: string }[]>([]);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [pendingApprovalAction, setPendingApprovalAction] = useState<"approve" | "submit" | "reject">("approve");
  const [approvalTitle, setApprovalTitle] = useState("Approval Action");
  const [approvalDescription, setApprovalDescription] = useState("Please provide justification or notes.");
 const [additionalCharges, setAdditionalCharges] = useState<AdditionalChargeEntry[]>([]);

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
    limit: 0,
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
 
  const { data: renewalData, isLoading: renewalLoading, refetch: refetchRenewal } =
    useRenewalDoc(propertyId || undefined);
 
  const { data: renewalRoleData } = useRenewalRole(propertyId || undefined);
 
  const effectiveRole = renewalRoleData?.role;
  const isActingAsDelegate = !!renewalRoleData?.on_behalf_of;
  const effectiveIsPropertyDept = effectiveRole === "property_dept";
  const effectiveIsGLTeam = effectiveRole === "gl_team";
  const allowedWorkflowActions = renewalRoleData?.actions ?? [];
  const hasDelegatedAway = !!activeDelegation;
  const canSubmitWorkflow = allowedWorkflowActions.includes("submit") && !hasDelegatedAway;
  const canApproveWorkflow = allowedWorkflowActions.includes("approve") && !hasDelegatedAway;
  const canSendBackWorkflow = allowedWorkflowActions.includes("sendback") && !hasDelegatedAway;
  const canWithdrawWorkflow = allowedWorkflowActions.includes("withdraw") && !hasDelegatedAway;
 
  const renewalDoc = renewalData?.doc as RentalRenewal | undefined;
 
  const { data: propertyData, refetch: refetchProperty } = usePropertyDoc(
    renewalDoc?.property
  );
  const property = propertyData?.doc as PropertyMaster | undefined;
  const { data: chequeTypes = [] } = useChequeTypes();
  const { data: paymentScheduleOptions = [] } = usePaymentScheduleOptions();
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
  const currentRentValue = Number(property?.current_rent ?? renewalDoc?.current_rent ?? 0);
  const rentChangeAmountState = Math.round(Number(proposedRent || 0) - currentRentValue);
  const rentChangeAmountDisplay =
    renewalDoc?.rent_change ?? Math.round(Number(renewalDoc?.proposed_rent ?? 0) - Number(renewalDoc?.current_rent ?? 0));
 
  useEffect(() => {
    if (open) {
      setSupportingFiles([]);
      setChequeDetails([]);
      setMiroNumbers([]);
      setParticulars([]);
      // setMiroNumberErrors({});
    }
  }, [open]);

  useEffect(() => {
    if (!open || !renewalDoc) return;

    setLocalModified(renewalDoc.modified || "");
    setChequeDetails(renewalDoc.cheque_details || []);
    setMiroNumbers(
      (renewalDoc.table_gfwd || [])
        .map((row) => row.miro_number || "")
        .filter(Boolean)
    );
    setParticulars(
      (renewalDoc.table_xqmr || []).map((row) => ({
        label: row.label || "",
        amount: row.amount !== undefined && row.amount !== null ? String(row.amount) : "",
      }))
    );

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
      cheque_details: renewalDoc.cheque_details || [],
    });
  }, [open, renewalDoc, reset]);
 
useEffect(() => {
  const current = currentRentValue;
  const proposed = Number(proposedRent || 0);

  if (current <= 0) {
    setRentChangePercentState("0");
    return;
  }

  const percent = ((proposed - current) / current) * 100;
  setRentChangePercentState(percent.toFixed(2));
}, [currentRentValue, proposedRent]);

useEffect(() => {
  if (!open || !renewalDoc) return;

  const rows = renewalDoc.table_xqmr || [];

  // Rows like "<Label> Vat" are auto-derived from their base particular and
  // should not be stored as their own entries, otherwise every save cycle
  // re-adds the derived VAT row on top of the one already persisted.
  const vatCompanionLabels = new Set(
    rows
      .filter((row) => rows.some((r) => r.label === `${row.label} Vat`))
      .map((row) => `${row.label} Vat`)
  );

  const charges: AdditionalChargeEntry[] = rows
    .filter((row) => !vatCompanionLabels.has(row.label || ""))
    .map((row) => ({
      label: row.label || "",
      amount: String(row.amount ?? ""),
      vatIncluded: vatCompanionLabels.has(`${row.label} Vat`),
    }));

  setAdditionalCharges(charges);

}, [open, renewalDoc]);
 
  const formatDateForAPI = (date?: string) => {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  };
  const formatDate = (date?: string) => {
    if (!date) return "";
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${d.getFullYear()}`;
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
      cheque.cheque_type &&
      cheque.cheque_date &&
      // cheque.payee &&
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

    // Cheque total must match backend particular_total
    const enteredChequeTotal = chequeDetails.reduce(
      (sum, cheque) => sum + Number(cheque.cheque_amount || 0),
      0
    );

    // Backend value is expected to be available on renewalDoc
    const particularTotal = Number(
      (renewalDoc as any)?.particular_total ?? 0
    );


    if (!particularTotal) {
      toast.error(`particular_total value is missing. Expected particular_total, got: ${particularTotal}`);
      return false;
    }

    if (Number(enteredChequeTotal) !== Number(particularTotal)) {
      toast.error(
        <div className="text-md">
          <div className="text-green-400">Cheque total must be : {particularTotal}</div>
          <div className="text-red-500">Entered total : {enteredChequeTotal}</div>
        </div>
      );
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
    //  const hasContractDoc = contractFiles.length > 0 || !!renewalDoc?.renewed_contract_document;
    // if (!hasContractDoc) {
    //   toast.error("Renewed Contract Document is required before confirming");
    //   return false;
    // }
  }
 
  // GL Team → MIRO
  if (
    (isGLTeam || effectiveIsGLTeam) &&
    renewalDoc?.workflow_state === "Pending MIRO"
  ) {
    const validMiroNumbers = miroNumbers.filter((value) => /^\d+$/.test(value.trim()));

    if (validMiroNumbers.length === 0) {
      toast.error("At least one MIRO Number is required before completing");
      return false;
    }

    if (validMiroNumbers.length !== miroNumbers.length) {
      toast.error("Please complete every MIRO Number field before completing");
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
          cheque.cheque_type &&
          cheque.cheque_date &&
          // cheque.payee &&
          Number(cheque.cheque_amount || 0) > 0
        )
        .map((cheque) => ({
          cheque_type: cheque.cheque_type,
          cheque_amount: Number(cheque.cheque_amount),
          cheque_date: cheque.cheque_date,
          payee: cheque.payee,
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
      payload.miro_numbers = miroNumbers
        .map((value) => value.trim())
        .filter(Boolean);
    }
 
    if (!isWorkflowProgressState(currentState)) {
      throw new Error("This renewal stage does not support progress save");
    }
 
    const savedDoc = await propertyApi.saveRenewalProgress(payload);
    // if (currentState === "Pending Property PO") {
    //   setContractFiles([]);
    // }
    setLocalModified(savedDoc?.modified || latestDoc.modified || "");
 
    return { latestDoc, savedDoc };
  };
 
  const handleWorkflowConfirm = handleSubmit(async (data) => {
    if (!propertyId) return;
    if (!validateBeforeWorkflow()) return;
 
    try {
      await saveWorkflowProgress(data);
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

    // const wasGLMiroCompletion =
    //   (isGLTeam || effectiveIsGLTeam) &&
    //   action === "approve" &&
    //   renewalDoc?.workflow_state === "Pending MIRO";

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
          // if (wasGLMiroCompletion && propertyId) {
          //   handleDownload(propertyId)
          // }
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
 
  const renderDelegationActionButton = () => {
    // if (isActingAsDelegate) return null;

    // if (activeDelegation) return null;

    return (
      <Button
        className="w-full bg-gray-200 text-gray-700 hover:bg-gray-300"
        type="button"
        // disabled={isDelegationLoading}
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
        // setContractFiles([]);
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
 
      const newSupportingDocuments =
        supportingFiles.length > 0
          ? (await Promise.all(supportingFiles.map(uploadFile))).map((url) => ({
              attachment: url,
            }))
          : [];

      const supportingDocuments = [
        ...(latestDoc.supporting_documents || []),
        ...newSupportingDocuments,
      ];
 
      const contractDocUrl =
        contractFiles.length > 0
          ? (await Promise.all(contractFiles.map(uploadFile)))[0]
          : latestDoc.renewed_contract_document;
 
      const rentPercent = Number(rentChangePercentState) || 0;
      const rentChangeAmount = Math.round(Number(data.proposed_rent || 0) - Number(latestDoc.current_rent || 0));
 
      const updatedChequeDetails = chequeDetails.map((cheque, index) => ({
        doctype: "JH Property Cheque Detail",
        ...cheque,
        cheque_amount: Number(cheque.cheque_amount || 0),
        idx: index + 1,
      }));

      const updatedParticulars = additionalCharges.flatMap((entry, index) => {
  if (!entry.label.trim()) return [];

  const rows = [
    {
      doctype: "JH Property Particulars",
      label: entry.label.trim(),
      amount: Number(entry.amount),
      vat: entry.vatIncluded,
      idx: index + 1,
    },
  ];

  if (entry.vatIncluded) {
    rows.push({
      doctype: "JH Property Particulars",
      label: `${entry.label.trim()} Vat`,
      amount: Number(
        (Number(entry.amount) * 0.05).toFixed(2)
      ),
      vat: false,
      idx: index + 2,
    });
  }

  return rows;
});
 
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
        rent_change: rentChangeAmount,
        rent_change_percent: rentPercent,
        property: latestDoc.property,
        current_rent: latestDoc.current_rent,
        supporting_documents: supportingDocuments,
        renewed_contract_document: contractDocUrl,
        cheque_details: updatedChequeDetails,
        table_xqmr: updatedParticulars,
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
      // setContractFiles([]);
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

  const isImageFile = (url: string) => /\.(png|jpg|jpeg)$/i.test(url);
 
  const renderReadonlyField = (
    label: string,
    value?: string | number,
   
  ) => (
    <div className="flex items-center gap-2 py-1 text-sm">
      <span className="font-medium text-gray-600" >
        {label}:
      </span>
      <span className="font-medium text-gray-600">{value}</span>
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
          <div className="flex gap-1 text-sm ">
            <Label className="text-gray-600">{label} :</Label>
            <span>{type === "date" ? formatDate(value) : value}</span>
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
      <Sheet open={open} >
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
    <Sheet open={open} >
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
                    {renderReadonlyField("Co Code", property.co_code)}
                    {renderReadonlyField("Property Type", property.type_of_property)}
                    {renderReadonlyField("Number of Units", property.number_of_units)}
                    {renderReadonlyField("Tenancy Period", property.tenancy_period)}
                    
                    {/* {renderReadonlyField("Current Rent", property.current_rent)} */}
                  </>
                )}
              </div>
            </div>
 
            <Separator />
 
            <h2 className="text-lg font-semibold">Renewal Details</h2>
            <div
              className={`grid items-start gap-3 py-1 ${
                isView
                  ? "grid-cols-1 lg:grid-cols-3 items-center"
                  : "grid-cols-1 md:grid-cols-3 items-center"
              }`}
            >
              <div className={`${isView ? "flex gap-2 text-sm" : "flex flex-col gap-1"}`}>
                <Label className="text-gray-600 ">Current Rent :</Label>
                {isView ? (
                  <div>{currentRentValue}</div>
                ) : (
                  <Input value={currentRentValue || ""} readOnly className="bg-gray-200" />
                )}
              </div>

              {renderRenewalField(
                "Proposed New Rent",
                "proposed_rent",
                String(renewalDoc?.proposed_rent ?? ""),
                "number",
                true
              )}


              <div className={`${isView ? "flex gap-2 text-sm" : "flex flex-col gap-1"}`}>
                <Label className="text-gray-600">Rent Increase Amount:</Label>
                {isView ? (
                  <div>{rentChangeAmountDisplay}</div>
                ) : (
                  <Input value={rentChangeAmountState} readOnly className="bg-gray-200" />
                )}
              </div>

              <div className={`${isView ? "flex gap-2 text-sm" : "flex flex-col gap-1"}`}>
                <Label className="text-gray-600">Rent Change %:</Label>
                {isView ? (
                  <div>{Number(renewalDoc?.rent_change_percent ?? 0).toFixed(2)}%</div>
                ) : (
                  <Input value={`${rentChangePercentState}%`} readOnly className="bg-gray-200" />
                )}
              </div>

              <div>
                {isView ? (
                  <div className="flex gap-1 text-sm">
                    <Label className=" text-gray-600">Payment Schedule:</Label>
                    <span>{renewalDoc?.payment_schedule}</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm text-gray-600">Payment Schedule</Label>
                    <Controller
                      name="payment_schedule"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentScheduleOptions.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                )}
              </div>
 
              {renderRenewalField("Renewal From", "renewal_from", renewalDoc?.renewal_from, "date", true)}
              {renderRenewalField("Renewal To", "renewal_to", renewalDoc?.renewal_to, "date", true)}
               {/* {renderRenewalField(
                "New Security Deposit",
                "new_security_deposit",
                String(renewalDoc?.new_security_deposit ?? ""),
                "number"
              )} */}
              <div className={`${isView ? "flex items-start flex-nowrap py-1 gap-2" : "flex flex-col gap-1 py-1"}`}>
                <Label className="text-gray-600">Remarks:</Label>
                {isView ? (
                  <div className="flex-wrap text-sm h-auto">{renewalDoc?.remarks}</div>
                ) : (
                  <textarea {...register("remarks")} className="border text-sm rounded-md p-2 h-30  w-100 resize-vertical" />
                )}
              </div>
            </div>

              
            <div>
              <h3 className="text-md font-semibold mb-2">Particulars</h3>
              {isView ? (
                additionalCharges.length > 0 ? (
                  <div className="space-y-2 mb-6">
                    <div
                        className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-muted py-1 px-2 rounded-lg">
                          {additionalCharges.map((entry, index) => {
                            const vatAmount = entry.vatIncluded
                              ? (Number(entry.amount || 0) * 0.05).toFixed(2)
                              : null;
                            return (
                              <Fragment key={index}>
                                <div className="flex items-center gap-2 py-1 text-sm">
                                  <span>{entry.label}</span>
                                  {renderReadonlyField("", entry.amount)}
                                </div>
                                {vatAmount !== null && (
                                  <div className="flex items-center gap-2 py-1 text-sm">
                                    <span>{entry.label} Vat</span>
                                    {renderReadonlyField("", vatAmount)}
                                  </div>
                                )}
                              </Fragment>
                            );
                          })}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-6">No particulars added.</p>
                )
              ) : (
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
              )}
            </div>

            <div>
  <h3 className="text-md font-semibold mb-2">Supporting Documents</h3>
 
  {isView ? (
    <div className="space-y-2 mb-10">
      {renewalDoc?.supporting_documents?.length ? (
        renewalDoc.supporting_documents.map((doc, index) =>
          doc.attachment ? (
            <div key={doc.name ?? index} className="flex items-center gap-2 px-3">
              <span className="text-sm text-gray-700">
                {getFileName(doc.attachment)}
              </span>
              <a
                href={doc.attachment}
                {...(isImageFile(doc.attachment)
                  ? { download: getFileName(doc.attachment) }
                  : { target: "_blank", rel: "noopener noreferrer" })}
                className="text-blue-600 text-sm underline"
              >
                View
              </a>
            </div>
          ) : null
        )
      ) : (
        <p className="text-sm text-gray-500">No documents available</p>
      )}
    </div>
  ) : (
    <>
      {renewalDoc?.supporting_documents?.length ? (
        <div className="space-y-2 mb-4">
          <p className="text-sm font-medium text-gray-600">Existing Files</p>
          {renewalDoc.supporting_documents.map((doc, index) =>
            doc.attachment ? (
              <div key={doc.name ?? index} className="flex items-center gap-2 px-3">
                <span className="text-sm text-gray-700">
                  {getFileName(doc.attachment)}
                </span>
                <a
                  href={doc.attachment}
                  {...(isImageFile(doc.attachment)
                    ? { download: getFileName(doc.attachment) }
                    : { target: "_blank", rel: "noopener noreferrer" })}
                  className="text-blue-600 text-sm underline"
                >
                  View
                </a>
              </div>
            ) : null
          )}
        </div>
      ) : null}
 
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
                  {
                    chequeDetails.map((cheque, index) => (
                      <div className="flex gap-2 items-end bg-muted p-2 rounded-lg">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs">Type of Cheque</Label>
                            <Select
                              value={cheque.cheque_type || ""}
                              onValueChange={(value) => {
                                const next = [...chequeDetails];
                                next[index] = { ...next[index], cheque_type: value };
                                setChequeDetails(next);
                              }}
                            >
                              <SelectTrigger className="text-sm h-9">
                                <SelectValue placeholder="Select type..." />
                              </SelectTrigger>
                              <SelectContent>
                                {chequeTypes.map((type) => (
                                  <SelectItem className="cursor-pointer" key={type} value={type}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {(["cheque_date", "cheque_amount", "payee"] as const).map((fieldName) => (
                            <div key={fieldName} className="flex flex-col gap-1">
                              <Label className="text-xs">
                                {fieldName === "cheque_date" ? "Date" : fieldName === "cheque_amount" ? "Amount" : "Payee"}
                              </Label>
                              <Input
                                type={fieldName === "cheque_amount" ? "text" : fieldName === "cheque_date" ? "date" : "text"}
                                value={fieldName === "cheque_amount" ? (cheque[fieldName] === 0 ? "" : cheque[fieldName]) : (cheque[fieldName] || "")}
                                onChange={(e) => {
                                  const next = [...chequeDetails];
                                  if (fieldName === "cheque_amount") {
                                    const raw = e.target.value;
                                    if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                                      next[index] = { ...next[index], cheque_amount: raw === "" ? 0 : Number(raw) };
                                      setChequeAmountErrors((prev) => { const updated = { ...prev }; delete updated[index]; return updated; });
                                    } else {
                                      next[index] = { ...next[index] };
                                      setChequeAmountErrors((prev) => ({ ...prev, [index]: "Amount must be a number" }));
                                    }
                                  } else {
                                    next[index] = { ...next[index], [fieldName]: e.target.value };
                                  }
                                  setChequeDetails(next);
                                }}
                                className={`text-sm${fieldName === "cheque_amount" && chequeAmountErrors[index] ? " border-red-500 focus-visible:ring-red-500" : ""}`}
                              />
                              {fieldName === "cheque_amount" && chequeAmountErrors[index] && (
                                <p className="text-xs text-red-500">{chequeAmountErrors[index]}</p>
                              )}
                            </div>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 p-0 -mr-2"
                          onClick={() => {
                            setChequeDetails(chequeDetails.filter((_, i) => i !== index));
                            setChequeAmountErrors((prev) => {
                              const updated: Record<number, string> = {};
                              Object.entries(prev).forEach(([k, v]) => {
                                const ki = Number(k);
                                if (ki !== index) updated[ki > index ? ki - 1 : ki] = v;
                              });
                              return updated;
                            });
                          }}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  }
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-2 border-dashed h-10 text-sm"
                    onClick={() => setChequeDetails([...chequeDetails, { cheque_type: "", cheque_amount: 0, cheque_date: "", payee: "" }])}
                  >
                    + Add Cheque
                  </Button>
                </div>
              </>
            )}

             {isView &&
              [
                "Pending Admin HOD",
                "Pending FC",
                "Pending CFO",
                "Pending MD",
                "Pending Property PO",
                "Pending MIRO",
                "Completed",
              ].includes(renewalDoc?.workflow_state || "") && (
                <>
                  <Separator />
                  <h2 className="text-lg font-semibold">Cheque Details</h2>
                  {renewalDoc?.cheque_details && renewalDoc.cheque_details.length > 0 ? (
                    <div className="space-y-2">
                      {renewalDoc.cheque_details.map((cheque, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-muted py-1 px-2 rounded-lg"
                        >
                          {renderReadonlyField("Type", cheque.cheque_type)}
                          {renderReadonlyField("Date", cheque.cheque_date)}
                          {renderReadonlyField("Amount", cheque.cheque_amount)}
                          {renderReadonlyField("Payee", cheque.payee)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No cheque details added.</p>
                  )}

                  {renewalDoc?.po_number && (
                    <>
                     <Separator />
                     <h2 className="text-lg font-semibold">Po Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      {renderReadonlyField("PO Number", renewalDoc.po_number)}
                    </div>
                    </>
                  )}

                  {/* {(renewalDoc?.miro_number || renewalDoc?.workflow_state === "Pending MIRO") && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-2 pb-10">
                      {renderReadonlyField("MIRO Number", renewalDoc?.miro_number || "Pending")}
                    </div>
                  )} */}
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
                        {...(isImageFile(renewalDoc.renewed_contract_document)
                          ? { download: getFileName(renewalDoc.renewed_contract_document) }
                          : { target: "_blank", rel: "noopener noreferrer" })}
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
                <div className="space-y-4 pb-10 flex flex-wrap gap-2">
                  {(
                    miroNumbers.map((miroNumber, index) => (
                      <div key={index} className="flex w-60 gap-x-2 gap-y-0.5 items-end bg-muted p-3 rounded-lg">
                        <div className="flex-1 flex flex-col gap-1">
                          <Label className="text-xs">
                            MIRO Number<span className="text-red-500 ml-0.5">*</span>
                          </Label>
                          <Input
                            type="text"
                            value={miroNumber}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const next = [...miroNumbers];
                              next[index] = raw;
                              setMiroNumbers(next);

                              // setMiroNumberErrors((prev) => {
                              //   const updated = { ...prev };
                              //   if (raw !== "" && !/^\d*$/.test(raw)) {
                              //     updated[index] = "MIRO number must contain numbers only";
                              //   } else {
                              //     delete updated[index];
                              //   }
                              //   return updated;
                              // });
                            }}
                            // className={`text-sm${miroNumberErrors[index] ? " border-red-500 focus-visible:ring-red-500" : ""}`}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 p-0 -mr-2"
                          onClick={() => {
                            setMiroNumbers(miroNumbers.filter((_, i) => i !== index));
                          }}
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
                    onClick={() => setMiroNumbers([...miroNumbers, ""])}
                  >
                    + Add MIRO Number
                  </Button>
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
                  {/* <Button
                    variant="outline"
                    className="w-full"
                    type="button"
                    onClick={() => onOpenChange(false)}
                  >
                    Close
                  </Button> */}
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
    "Pending Approver 4",
    "Pending Approver 5",
    "Pending Approver 6",
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
                  {/* <Button variant="outline" className="w-full" type="button" onClick={() => onOpenChange(false)}>
                    Close
                  </Button> */}
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
                  {/* <Button variant="outline" className="w-full" type="button" onClick={() => onOpenChange(false)}>
                    Close
                  </Button> */}
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
                  {/* <Button variant="outline" className="w-full" type="button" onClick={() => onOpenChange(false)}>
                    Close
                  </Button> */}
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
            ) : !isView &&
              <>
                {/* <Button variant="outline" className="w-full" type="button" onClick={() => onOpenChange(false)}>
                  Close
                </Button> */}
                <Button
                  type="submit"
                  form={formId}
                  disabled={renewalDoc?.workflow_state !== "Draft"}
                  className="w-full bg-[#972e26] hover:bg-[#972e26]/90"
                >
                  Update Renewal
                </Button>
              </>
             }
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