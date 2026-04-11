import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { XIcon } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from 'sonner';
import FileAttachment from "./FileAttachment";
import { useQueryClient } from '@tanstack/react-query';
import { useDocDetail, useDocs, useSaveDoc, useUpdateDoc } from "@/hooks/doc";
import { useCallback, useEffect, useState } from "react";
import { debounce } from "lodash";
import { useApplyWorkflowAction } from "../hooks/useApplyWorkflowAction";
import { useRef } from "react";
import { PropertyMaster, RentalRenewal, ChequeDetail } from "@/types/PropertyAutomation";

type RenewalSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string | null;
  mode: "view" | "edit" | "create";
  formatDate: (date?: string) => string;
  workflowColorHighlight?: (date?: string) => string;
  typeOptions?: string[];
  isLicensingTeam:boolean;
  isJHPropertyDEpartment: boolean;
  isCfo : boolean;
  isGMTeam:boolean;
   isMD: boolean;
  isApprover:boolean;
  isGLTeam:boolean;
  isApprover1 : boolean;
  isApprover2 : boolean;
};

// Renewal Schema 
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

export default function RenewalSheet({ open, onOpenChange, propertyId, mode, formatDate, workflowColorHighlight,isLicensingTeam,isGMTeam,isJHPropertyDEpartment,isCfo ,isMD,isApprover,isGLTeam,isApprover1,isApprover2}: RenewalSheetProps) {

  // Separate file states for different Attach fields
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);
  const [contractFiles, setContractFiles] = useState<File[]>([]);

  useEffect(() => {
  if (open && propertyId) {
    refetchRenewal();
  }
}, [open, propertyId]);


  useEffect(() => {
  if (renewalDoc && open) {
    setLocalModified(renewalDoc.modified || "");

    setCurrentChequeDetails(renewalDoc.cheque_details || []);

    reset({
      division: renewalDoc?.division || '',
      proposed_rent: Number(renewalDoc?.proposed_rent || 0),
      renewal_to: renewalDoc?.renewal_to || '',
      renewal_from: renewalDoc?.renewal_from || '',
      additional_charges: Number(renewalDoc?.additional_charges || 0),
      payment_schedule: renewalDoc?.payment_schedule || '',
      new_security_deposit: Number(renewalDoc?.new_security_deposit || 0),
      remarks: renewalDoc?.remarks || '',
      po_number: renewalDoc?.po_number || '',
      miro_number: renewalDoc?.miro_number || '',
    });

    if (renewalDoc?.cheque_details?.[0]) {
      const cd = renewalDoc.cheque_details[0];

      setValue('bank_name', cd.bank_name || '');
      setValue('cheque_number', cd.cheque_number || '');
      setValue('cheque_amount', cd.cheque_amount || 0); // ✅ FIX (no string)
      setValue('cheque_date', cd.cheque_date || '');
      setValue('payee', cd.payee || '');
      setValue('signatory', cd.signatory || '');
    }
  }
}, [ open]); 

//  form fields
  const saveDoc = useSaveDoc();
  const updateDoc = useUpdateDoc();
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const formId = "renewal-form";

  const applyActionRef = useRef<((payload: any, options?: any) => void) | null>(null);
  const workflowMutation = useApplyWorkflowAction();
  applyActionRef.current = workflowMutation.mutate;

  // Fetch renewal document
  const { data: renewalData, isLoading: renewalLoading, refetch: refetchRenewal } = useDocDetail<RentalRenewal>({
    doctype: "JH Property Rental Renewal",
    name: propertyId || "",
    disabled: !propertyId,
  });

  const renewalDoc = renewalData?.docs?.[0] as RentalRenewal | undefined;

  // Fetch property document for readonly display
  const { data: propertyData, refetch: refetchProperty } = useDocDetail<PropertyMaster>({
    doctype: "JH Property Master",
    name: renewalDoc?.property || "",
    disabled: !renewalDoc?.property,
  });

  const property = propertyData?.docs?.[0] as PropertyMaster | undefined;

  // Divisions
  const { data: divisionData } = useDocs({
    doctype: "JH Division Master",
  });

const [rentChangePercentState, setRentChangePercentState] = useState("0");
  const [currentChequeDetails, setCurrentChequeDetails] = useState<ChequeDetail[]>([]);
  const [localModified, setLocalModified] = useState<string>("");

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

  const proposedRent = useWatch({ control, name: "proposed_rent" }) || '0';
  const currentRent = renewalDoc?.current_rent || 0;

  // Debounced rent calculation
  const debouncedCalculateRent = useCallback(
    debounce(async (currentRentNum: number, proposedRentNum: number) => {
      if (currentRentNum <= 0) {
        setRentChangePercentState("0");
        return;
      }
      try {
        const params = new URLSearchParams({
          current_rent: currentRentNum.toString(),
          proposed_rent: String(proposedRentNum),
        });
        const res = await fetch(`/api/method/jh_digitrack.api.property_management.calculate_rent_change_percent?${params}`, {
          credentials: "include",
        });
        const data = await res.json();
        setRentChangePercentState(String(data.message?.rent_change_percent || 0));
      } catch (error) {
        console.error("Rent calc error:", error);
        setRentChangePercentState("0");
      }
    }, 500),
    []
  );

  useEffect(() => {
    const proposedNum = Number(proposedRent || '0');
    debouncedCalculateRent(currentRent, proposedNum);
  }, [proposedRent, currentRent, debouncedCalculateRent]);

  useEffect(() => {
    if (renewalDoc) {
      // TRACK MODIFIED FOR CONFLICT CHECK
      setLocalModified(renewalDoc.modified || "");
      
      // Preserve existing data
      setCurrentChequeDetails(renewalDoc.cheque_details || []);
      
  reset({
        division: renewalDoc?.division || '',
        proposed_rent: Number(renewalDoc?.proposed_rent || 0),
        renewal_to: renewalDoc?.renewal_to || '',
        renewal_from: renewalDoc?.renewal_from || '',
        additional_charges: Number(renewalDoc?.additional_charges || 0),
        payment_schedule: renewalDoc?.payment_schedule || '',
        new_security_deposit: Number(renewalDoc?.new_security_deposit || 0),
        remarks: renewalDoc?.remarks || '',
        po_number: renewalDoc?.po_number || '',
        miro_number: renewalDoc?.miro_number || '',
      });
      
      // Load first cheque detail for form fields
      if (renewalDoc?.cheque_details?.[0]) {
        const cd = renewalDoc.cheque_details[0];
        setValue('bank_name', cd.bank_name || '');
        setValue('cheque_number', cd.cheque_number || '');
        setValue('cheque_amount', cd.cheque_amount || 0);
        setValue('cheque_date', cd.cheque_date || '');
        setValue('payee', cd.payee || '');
        setValue('signatory', cd.signatory || '');
      }
    }
  }, [renewalDoc, reset, setValue]);

  const applyAction = useCallback((payload: any, options?: any) => {
    if (applyActionRef.current) {
      applyActionRef.current(payload, options);
    } else {
      console.error('Workflow action not available');
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
    return data.message.file_url;
  };
const onSubmit = async (data: z.infer<typeof renewalSchema>) => {
  try {
    //  ALWAYS get latest doc before saving (fix conflict issue)
    const latest = await refetchRenewal();
    const latestDoc = latest.data?.docs?.[0];

    if (!latestDoc) {
      toast.error("Failed to fetch latest document");
      return;
    }

    //  Detect conflict properly
    if (localModified && latestDoc.modified !== localModified) {
      toast.error("Document was updated by another user. Reloading latest data...");
      reset(); // reset form
      return;
    }

    //  Update local modified to latest
    setLocalModified(latestDoc.modified);

    //  Validate cheque
    const chequeAmount = Number(getValues("cheque_amount") || 0);
    if (isJHPropertyDEpartment && chequeAmount <= 0) {
      toast.error("Please enter valid Cheque Amount (> 0)");
      return;
    }

    //  File handling (preserve old if no new)
    const supportingDocUrl = supportingFiles.length > 0
      ? (await Promise.all(supportingFiles.map(uploadFile)))[0]
      : latestDoc.supporting_documents;

    const contractDocUrl = contractFiles.length > 0
      ? (await Promise.all(contractFiles.map(uploadFile)))[0]
      : latestDoc.renewed_contract_document;

    const rentPercent = Number(rentChangePercentState) || 0;

    //  Build cheque details properly
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

    //  FINAL PAYLOAD (use latestDoc, NOT stale renewalDoc)
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

      //  CRITICAL: always use latestDoc values
      property: latestDoc.property,
      current_rent: latestDoc.current_rent,

      supporting_documents: supportingDocUrl,
      renewed_contract_document: contractDocUrl,

      cheque_details: updatedChequeDetails,

      flags: {
        ignore_validate_update_after_submit: true,
      },
    };

    const result = await updateDoc.mutateAsync({
      doctype: "JH Property Rental Renewal",
      name: propertyId,
      doc: payload,
    });

    console.log("Update SUCCESS:", result?.message || result);

    toast.success("Cheque Entry saved successfully");

    await refetchRenewal();
    await refetchProperty();

    onOpenChange(false);
    reset();
    setSupportingFiles([]);
    setContractFiles([]);

  } catch (error: any) {
    console.error("Submit ERROR:", error);

    //  HANDLE CONFLICT CLEANLY
    if (error?.message?.includes("modified after")) {
      toast.error("Document updated. Reloading latest data...");
      await refetchRenewal();
      return;
    }

    toast.error(error?.message || "Save failed");
  }
};

  const getFileName = (url: string) => url.split("/").pop() || '';

  const renderReadonlyField = (label: string, value?: string | number, minW = "140px") => (
    <div className="flex items-center gap-2 py-1 text-sm">
      <span className="font-medium text-gray-600 min-w-[minW]">{label}:</span>
      <span>{value }</span>
    </div>
  );

  console.log(isLicensingTeam,"lice")
  console.log(renewalDoc?.workflow_state,"workflow")

  const renderRenewalField = (label: string, name: keyof z.infer<typeof renewalSchema>, value?: string, type = "text") => {
    return (
      <div>
              {
                isView  ? ( 
              <div className="flex gap-1">
                <Label className="text-sm text-gray-600">{label}</Label>
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
                  className={errors[name] ? "border-red-500" : ""}
                />
              )}
            />
        {errors[name] && (
          <span className="text-red-500 text-xs">{errors[name]?.message as string}</span>
        )}
      </div>
        )}
      </div>

     
    );
  };


   const renderRenewalRoleField = (label: string, name: keyof z.infer<typeof renewalSchema>, value?: string, type = "text") => {
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
                  className={errors[name] ? "border-red-500" : ""}
                />
              )}
            />
        {errors[name] && (
          <span className="text-red-500 text-xs">{errors[name]?.message as string}</span>
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
            {/* Property Details - READONLY */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Property Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2  rounded-lg">
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

            {/* Renewal Edit Fields */}
            <h2 className="text-lg font-semibold">Renewal Details</h2>
           <div
                className={`grid items-start gap-4 py-1${
                  isView
                    ? "grid-cols-1 lg:grid-cols-3"
                    : "grid-cols-1 md:grid-cols-4 lg:grid-cols-5"
                }`}
              >
              {renderRenewalField("Proposed Rent", "proposed_rent", String(renewalDoc?.proposed_rent), "number")}
              {renderRenewalField("Additional Charges", "additional_charges", String(renewalDoc?.additional_charges), "number")}
                <div className={`${isView ? "flex gap-2" : "flex flex-col gap-1"}`}>
                  <Label className="text-gray-600">Rent Change %: </Label>
                   {isView ? (
                      <div>{renewalDoc?.rent_change_percent ?? 0}%</div>
                    ): (
                  <Input value={rentChangePercentState + "%"} readOnly className="bg-gray-200" />
                    )}
                </div>
              {renderRenewalField("Renewal From", "renewal_from", renewalDoc?.renewal_from, "date")}
              {renderRenewalField("Renewal To", "renewal_to", renewalDoc?.renewal_to, "date")}
              {renderRenewalField("Payment Schedule", "payment_schedule", renewalDoc?.payment_schedule || '')}
              {renderRenewalField("New Security Deposit", "new_security_deposit", String(renewalDoc?.new_security_deposit), "number")}
              <div className={`${isView? "flex py-1 gap-2" : "flex flex-col gap-1 py-1"}`}>
                  <Label className="text-gray-600">Remarks: </Label> 
                  {isView ? (
                    <div>{renewalDoc?.remarks}</div>
                  ): (
                      <textarea {...register("remarks")} className="border rounded-md p-2 h-20 resize-vertical" /> 
                  )}
                  
              </div> 
        
            </div>

              {/* Supporting Documents  */}
              <div>
                <h3 className="text-md font-semibold mb-2">Supporting Documents</h3>
                {isView ? (
                  <div className="space-y-2">
                    {renewalDoc?.supporting_documents ? (
                      <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded">
                        <span className="text-sm">{getFileName(renewalDoc.supporting_documents)}</span>
                        <a href={renewalDoc.supporting_documents} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">View</a>
                      </div>
                    ) : <p>No document</p>}
                  </div>
                ) : (
                  <FileAttachment files={supportingFiles} setFiles={setSupportingFiles} />
                )}
              </div>

              
            {isJHPropertyDEpartment && renewalDoc?.workflow_state === "Pending Cheque Details" && (
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
              
               {isJHPropertyDEpartment && renewalDoc?.workflow_state === "Pending Property PO" && (
                <>
                  <Separator />
                  <h2 className="text-lg font-semibold">PO Details</h2>

                  <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 items-start gap-4">
                  {renderRenewalRoleField("PO Number", "po_number", renewalDoc?.po_number || '')}
                  </div>
 
                  {/* Renewed Contract Document */}
                  <div>
                    <h3 className="text-md font-semibold mb-2">Renewed Contract Document</h3>
                  {isView ? (
                    <div className="space-y-2">
                      {renewalDoc?.renewed_contract_document ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded">
                          <span className="text-sm">{getFileName(renewalDoc.renewed_contract_document)}</span>
                          <a href={renewalDoc.renewed_contract_document} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">View</a>
                        </div>
                      ) : <p>No document</p>}
                    </div>
                  ) : (
                    <FileAttachment files={contractFiles} setFiles={setContractFiles}  />
                  )}
                </div>
             </>
               )}


                 {isGLTeam && renewalDoc?.workflow_state === "Pending MIRO" && (
                <>
                  <Separator />
                  <h2 className="text-lg font-semibold">Miro Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 items-start gap-4 pb-10">
                {renderRenewalRoleField("MIRO Number", "miro_number", renewalDoc?.miro_number || '')}
              </div>
              </>
                 )}
          </form>
        </ScrollArea>

        <SheetFooter className="absolute bottom-0 w-full pr-10 bg-white">
          <div className="flex w-full gap-2">
              {isView && isLicensingTeam && renewalDoc?.workflow_state === "Draft" ? (
               <div className="flex gap-3 w-full">
               
                <Button variant="outline" 
                  className="w-full" 
                  type="button">Close</Button>
                <Button 
                  className="w-full bg-primary text-white" 
                  type="button" 
                  onClick={() => {
                    if (!propertyId) return;
                    applyAction({ renewal_id: propertyId, action: "submit" }, {
                      onSuccess: (data: any) => {
                        console.log("Button Success:", data);
                        refetchRenewal();
                        onOpenChange(false);
                      }
                    });
                  }}
                >
                  Submit for Head Review
                </Button>
              </div>
            ) : (
                isApprover1 && renewalDoc?.workflow_state === "Pending Approver 1" && isView ? (
              <div className="flex gap-3 w-full">
               
                <Button variant="outline" 
                  className="w-full " 
                  type="button">Withdraw</Button>
                   <Button className="w-full bg-gray-400" type="button">Send Back</Button>
                   <Button 
                  className="w-full bg-primary text-white" 
                  type="button" 
                  onClick={() => {
                    if (!propertyId) return;
                    applyAction({renewal_id: propertyId, action: "approve" }, {
                      onSuccess: (data: any) => {
                        refetchRenewal();
                        onOpenChange(false);
                      }
                    });
                  }}
                >
                  Submit for GM Review
                </Button>
               
              </div>

            ) : isApprover2 && renewalDoc?.workflow_state === "Pending Approver 2" && isView ? (
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="w-full" type="button">Withdraw</Button>
                <Button className="w-full bg-gray-400" type="button">Send Back</Button>
                <Button 
                  className="w-full bg-primary text-white" 
                  type="button" 
                  onClick={() => {
                    if (!propertyId) return;
                    applyAction({ renewal_id: propertyId, action: "approve" }, {
                      onSuccess: () => {
                        refetchRenewal();
                        onOpenChange(false);
                      }
                    });
                  }}
                >
                  Submit for Cheque Entry
                </Button>
              </div>
            ) :  isCfo && renewalDoc?.workflow_state === "Pending CFO" && isView ? (
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="w-full" type="button">Withdraw</Button>
                <Button className="w-full bg-gray-400" type="button">Send Back</Button>
                <Button 
                  className="w-full bg-primary text-white" 
                  type="button" 
                  onClick={() => {
                    if (!propertyId) return;
                    applyAction({ renewal_id: propertyId, action: "approve" }, {
                      onSuccess: () => {
                        refetchRenewal();
                        onOpenChange(false);
                      }
                    });
                  }}
                >
                  Submit to next /complete
                </Button>
              </div>
            ) :
            isMD && renewalDoc?.workflow_state === "Pending MD" && isView ? (
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="w-full" type="button">Withdraw</Button>
                <Button className="w-full bg-gray-400" type="button">Send Back</Button>
                <Button 
                  className="w-full bg-primary text-white" 
                  type="button" 
                  onClick={() => {
                    if (!propertyId) return;
                    applyAction({ renewal_id: propertyId, action: "approve" }, {
                      onSuccess: () => {
                        refetchRenewal();
                        onOpenChange(false);
                      }
                    });
                  }}
                >
                  Approve
                </Button>
              </div>
            ) :  isJHPropertyDEpartment && renewalDoc?.workflow_state === "Pending Cheque Details" && isView ? (
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="w-full" type="button" onClick={() => onOpenChange(false)}>
                Close
              </Button>
                {/* <Button variant="outline" className="w-full" type="button">Withdraw</Button>
                <Button className="w-full bg-gray-400" type="button">Send Back</Button> */}
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white" 
                  type="submit"
                  form={formId}
                  disabled={isSubmitting || !isValid || (localModified && renewalDoc?.modified && localModified !== renewalDoc.modified)}
                  title={localModified && renewalDoc?.modified && localModified !== renewalDoc.modified ? "Document modified externally - refresh first" : ""}
                >
                  {isSubmitting ? "Saving..." : "Save Cheque Entry"}
                </Button>
                <Button 
                  className="w-full bg-primary text-white" 
                  type="button" 
                  onClick={() => {
                    if (!propertyId) return;
                    applyAction({ renewal_id: propertyId, action: "approve" }, {
                      onSuccess: () => {
                        refetchRenewal();
                        onOpenChange(false);
                      }
                    });
                  }}
                >
                  Confirm Cheque Entry
                </Button>
              </div>
            ): 
            isJHPropertyDEpartment && renewalDoc?.workflow_state === "Pending Property PO" && isView ? (
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="w-full" type="button" onClick={() => onOpenChange(false)}>
                Close
              </Button>
                {/* <Button variant="outline" className="w-full" type="button">Withdraw</Button>
                <Button className="w-full bg-gray-400" type="button">Send Back</Button> */}
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white" 
                  type="submit"
                  form={formId}
                  disabled={isSubmitting || !isValid || (localModified && renewalDoc?.modified && localModified !== renewalDoc.modified)}
                  title={localModified && renewalDoc?.modified && localModified !== renewalDoc.modified ? "Document modified externally - refresh first" : ""}
                >
                  {isSubmitting ? "Saving..." : "Save PO"}
                </Button>
                <Button 
                  className="w-full bg-primary text-white" 
                  type="button" 
                  onClick={() => {
                    if (!propertyId) return;
                    applyAction({ renewal_id: propertyId, action: "approve" }, {
                      onSuccess: () => {
                        refetchRenewal();
                        onOpenChange(false);
                      }
                    });
                  }}
                >
                  Confirm PO
                </Button>
              </div>
            ): 

            isGLTeam && renewalDoc?.workflow_state === "Pending MIRO" && isView ? (
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="w-full" type="button" onClick={() => onOpenChange(false)}>
                Close
              </Button>
                {/* <Button variant="outline" className="w-full" type="button">Withdraw</Button>
                <Button className="w-full bg-gray-400" type="button">Send Back</Button> */}
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white" 
                  type="submit"
                  form={formId}
                  disabled={isSubmitting || !isValid || (localModified && renewalDoc?.modified && localModified !== renewalDoc.modified)}
                  title={localModified && renewalDoc?.modified && localModified !== renewalDoc.modified ? "Document modified externally - refresh first" : ""}
                >
                  {isSubmitting ? "Saving..." : "Save MIRO Details"}
                </Button>
                <Button 
                  className="w-full bg-primary text-white" 
                  type="button" 
                  onClick={() => {
                    if (!propertyId) return;
                    applyAction({ renewal_id: propertyId, action: "approve" }, {
                      onSuccess: () => {
                        refetchRenewal();
                        onOpenChange(false);
                      }
                    });
                  }}
                >
                Mark Complete
                </Button>
              </div>
            ): 
           
             !isView ? (
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
            ))}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}