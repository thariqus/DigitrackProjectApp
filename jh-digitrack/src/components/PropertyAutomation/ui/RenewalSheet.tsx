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
import FileAttachment from "./FileAttachment";
import { useDocDetail, useDocs, useSaveDoc, useUpdateDoc } from "@/hooks/doc";
import { useCallback, useEffect, useState } from "react";
import { debounce } from "lodash";
import { useApplyWorkflowAction } from "../hooks/useApplyWorkflowAction";
import { PropertyMaster, RentalRenewal, ChequeDetail } from "@/types/JHDigitrack/JHPropertyAutomation";

type RenewalSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string | null; // actually renewal name
  mode: "view" | "edit" | "create";
  formatDate: (date?: string) => string;
  workflowColorHighlight?: (date?: string) => string;
  typeOptions?: string[];
  isLicensingTeam:boolean;
  isJHPropertyDEpartment:boolean;
};

// Renewal Schema matching doctype
const renewalSchema = z.object({
  division: z.string().optional(),
  proposed_rent: z.coerce.number().min(0, "Must be positive"),
  renewal_from: z.string().optional(),
  renewal_to: z.string().optional(),
  additional_charges: z.coerce.number().min(0).optional(),
  payment_schedule: z.string().optional(),
  new_security_deposit: z.coerce.number().min(0).optional(),
  remarks: z.string().optional(),
  po_number: z.string().optional(),
  miro_number: z.string().optional(),

}).partial();

export default function RenewalSheet({ open, onOpenChange, propertyId, mode, formatDate, workflowColorHighlight,isLicensingTeam,isJHPropertyDEpartment }: RenewalSheetProps) {

  // Separate file states for different Attach fields
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);
  const [contractFiles, setContractFiles] = useState<File[]>([]);
  const [chequeDetails, setChequeDetails] = useState<ChequeDetail[]>([]);
  const saveDoc = useSaveDoc();
  const updateDoc = useUpdateDoc();
  const { mutate: applyAction } = useApplyWorkflowAction();
   const isView = mode === "view";
  const isEdit = mode === "edit";
  const formId = "renewal-form";

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

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting, isValid },
    setValue,
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
          proposed_rent: proposedRentNum.toString(),
        });
        const res = await fetch(`/api/method/jh_digitrack.api.property_management.calculate_rent_change_percent?${params}`, {
          credentials: "include",
        });
        const data = await res.json();
        setRentChangePercentState((data.message?.rent_change_percent || 0).toString());
      } catch (error) {
        console.error("Rent calc error:", error);
        setRentChangePercentState("0");
      }
    }, 500),
    []
  );

  useEffect(() => {
    const proposedNum = Number(proposedRent);
    debouncedCalculateRent(currentRent, proposedNum);
  }, [proposedRent, currentRent, debouncedCalculateRent]);

  useEffect(() => {
    if (renewalDoc) {
      reset({
        division: renewalDoc?.division || '',
        proposed_rent: renewalDoc?.proposed_rent || '',
        renewal_to: renewalDoc?.renewal_to || '',
        renewal_from: renewalDoc?.renewal_from || '',
        additional_charges: renewalDoc?.additional_charges?.toString() || '',
        payment_schedule: renewalDoc?.payment_schedule || '',
        new_security_deposit: renewalDoc?.new_security_deposit?.toString() || '',
        remarks: renewalDoc?.remarks || '',
        po_number: renewalDoc?.po_number || '',
        miro_number: renewalDoc?.miro_number || '',
      });
      // Load existing cheque details
      setChequeDetails(renewalDoc.cheque_details || []);
    }
  }, [renewalDoc, reset]);

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
      // Handle multiple file types separately
      let supportingDocUrl: string | undefined;
      let contractDocUrl: string | undefined;
      
      if (supportingFiles.length > 0) {
        [supportingDocUrl] = await Promise.all(supportingFiles.map(uploadFile));
      }
      if (contractFiles.length > 0) {
        [contractDocUrl] = await Promise.all(contractFiles.map(uploadFile));
      }

      const rentPercent = Number(rentChangePercentState) || 0;

      const payload: Partial<RentalRenewal> = {
        ...data,
        property: renewalDoc?.property || propertyId || '',
        proposed_rent: Number(data.proposed_rent),
        additional_charges: Number(data.additional_charges || 0),
        new_security_deposit: Number(data.new_security_deposit || 0),
        rent_change_percent: rentPercent,
        renewal_from: formatDateForAPI(data.renewal_from),
        renewal_to: formatDateForAPI(data.renewal_to),
        cheque_details: chequeDetails,
        supporting_documents: supportingDocUrl,
        renewed_contract_document: contractDocUrl,
        doctype: "JH Property Rental Renewal",
      };

      if (isEdit && propertyId) {
        await updateDoc.mutateAsync({
          doctype: "JH Property Rental Renewal",
          name: propertyId,
          doc: payload,
        });
        toast.success("Renewal updated successfully");
      } else {
        await saveDoc.mutateAsync(payload);
        toast.success("Renewal created successfully");
      }

      queryClient.invalidateQueries({ queryKey: ["Docs"] });
      onOpenChange(false);
      reset();
      refetchProperty();
    } catch (error: any) {
      toast.error(error?.message || "Something went wrong");
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
    if (isView) {
      return (
        <div className="flex items-center gap-2 py-1 text-sm">
          <span className="font-medium text-gray-600">{label}:</span>
          <span>{value !== undefined ? value : (renewalDoc?.[name as keyof RentalRenewal] as string) || "-"}</span>
        </div>
      );
    }
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


              <>
               <Separator />

            {/* Renewal Edit Fields */}
            <h2 className="text-lg font-semibold">Renewal Details</h2>
           <div
                className={`grid items-start gap-4 py-1${
                  isView
                    ? "grid-cols-1 lg:grid-cols-5"
                    : "grid-cols-1 md:grid-cols-4 lg:grid-cols-5"
                }`}
              >
              {renderRenewalField("Proposed Rent", "proposed_rent", String(renewalDoc?.proposed_rent), "number")}
              {renderRenewalField("Additional Charges", "additional_charges", String(renewalDoc?.additional_charges), "number")}
              <div className={`${isView? "flex gap-2" : "flex flex-col gap-1"}`}>
                <Label className="text-gray-600 text-nowarp">Rent Change %: </Label>
                 {isView ? (
                    <div>{renewalDoc?.rent_change_percent}%</div>
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

              
              {isJHPropertyDEpartment && (
                <>

                <Separator />
            <h2 className="text-lg font-semibold">Cheque Details</h2>
              <div className="space-y-4 pb-10">
                {/* {chequeDetails.map((cheque, index) => ( */}
                  <div  className="border p-4 rounded-md space-y-2">
                    <Input
                      placeholder="Bank Name"
                      value={chequeDetails.bank_name || ''}
                      onChange={(e) => {
                        const newDetails = e.target.value;
                        setChequeDetails(newDetails);
                      }}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Cheque Number"
                        value={chequeDetails.cheque_number || ''}
                        onChange={(e) => {
                          const newDetails  = e.target.value;
                          setChequeDetails(newDetails);
                        }}
                      />
                      <Input
                        placeholder="Amount"
                        type="number"
                        value={chequeDetails.cheque_amount || ''}
                        onChange={(e) => {
                          const newDetails = Number(e.target.value);
                          setChequeDetails(newDetails);
                        }}
                      />
                    </div>
                    <Input
                      placeholder="Cheque Date"
                      type="date"
                      value={chequeDetails.cheque_date || ''}
                      onChange={(e) => {
                        const newDetails = e.target.value;
                        setChequeDetails(newDetails);
                      }}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Payee"
                        value={chequeDetails.payee || ''}
                        onChange={(e) => {
                          const newDetails =  e.target.value;
                          setChequeDetails(newDetails);
                        }}
                      />
                      <Input
                        placeholder="Signatory"
                        value={chequeDetails.signatory || ''}
                        onChange={(e) => {
                          const newDetails =  e.target.value;
                          setChequeDetails(newDetails);
                        }}
                      />
                    </div>
                   
                  </div>
               
                {/* <Button
                  type="button"
                  variant="outline"
                  onClick={() => setChequeDetails(prev => [...prev, {bank_name: '', cheque_number: '', cheque_amount: 0, cheque_date: '', payee: '', signatory: ''}])}>
                  Add Cheque Detail
                </Button> */}
              </div>
                </>  
            
            )}
             
              </>
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
                      onSuccess: (data) => {
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
                renewalDoc?.workflow_state === "Pending Approver 1" && isView ? (
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
                      onSuccess: () => {
                        onOpenChange(false);
                      }
                    });
                  }}
                >
                  Submit for GM Review
                </Button>
               
              </div>

            ) : renewalDoc?.workflow_state === "Pending Approver 2" && isView ? (
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
                        onOpenChange(false);
                      }
                    });
                  }}
                >
                  Submit for Cheque Entry
                </Button>
              </div>
            ) : isJHPropertyDEpartment && renewalDoc?.workflow_state === "Pending Cheque Details" && isView ? (
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="w-full" type="button" onClick={() => onOpenChange(false)}>
                Close
              </Button>
                {/* <Button variant="outline" className="w-full" type="button">Withdraw</Button>
                <Button className="w-full bg-gray-400" type="button">Send Back</Button> */}
                <Button className="w-full bg-gray-400" type="button">Save Cheque Entry</Button>
                <Button 
                  className="w-full bg-primary text-white" 
                  type="button" 
                  onClick={() => {
                    if (!propertyId) return;
                    applyAction({ renewal_id: propertyId, action: "submit" }, {
                      onSuccess: () => {
                        onOpenChange(false);
                      }
                    });
                  }}
                >
                  Confirm Cheque Entry
                </Button>
              </div>
            ): renewalDoc?.workflow_state === "Pending CFO" && isView ? (
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
                        onOpenChange(false);
                      }
                    });
                  }}
                >
                  Submit
                </Button>
              </div>
            ) :
             !isView ? (
              <Button variant="outline" className="w-full" type="button" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            ) : (
              <>
                <Button variant="outline" className="w-full" type="button" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                {/* <Button
                  type="submit"
                  form={formId}
                  disabled={isSubmitting || !isValid}
                  className="w-full bg-[#972e26] hover:bg-[#972e26]/90"
                >
                  {isSubmitting ? "Saving..." : "Update Renewal"}
                </Button> */}
              </>
            ))}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}