import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { XIcon } from "lucide-react";

import { Controller, useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router";
import { RentalRenewal } from "@/types/JHDigitrack/JHPropertyAutomation";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import FileAttachment from "./FileAttachment";
import { useDocDetail, useDocs, useSaveDoc, useUpdateDoc } from "@/hooks/doc";
import { useCallback, useEffect, useState } from "react";
import { PropertyMaster } from "@/types/JHDigitrack/JHPropertyAutomation";
import { toast } from "sonner";
import { queryClient } from "@/utils/query-client";
import StartRenewalModal from "./StartRenewalModal";

type PropertySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string | null;
  mode: "view" | "edit" | "create";
  formatDate: (date?: string) => string;
  renewalColorHighlight: (date?: string) => string;
  typeOptions: string[];
};

// ZOD SCHEMA

const propertySchema = z.object({
  property_name: z.string().min(1, "Required"),
  type_of_property: z.string().optional(),
  business_used: z.string().optional(),
  division_used: z.string().optional(),
  booked_under: z.string().optional(),
  profit_center: z.string().optional(),
  number_of_units: z.coerce.number().optional().optional(),
  number_of_premises: z.coerce.number().optional().optional(),
  premise_number: z.string().optional(),
  staff_allocated: z.string().optional(),

  location: z.string().optional(),
  emirate: z.string().optional(),
  country: z.string().default("UAE").optional(),
  makani_number: z.string().optional(),
  po_box_number: z.string().optional(),
  po_box_renewal_date: z.string().optional(),

  landlord: z.string().optional(),
  real_estate: z.string().optional(),
  current_rent: z.coerce.number().optional().optional(),
  renewal_date: z.string().min(1, "Required"),
  landlord_security_deposit: z.coerce.number().optional().optional(),
  tenancy_period: z.string().optional(),
  lease_start_date: z.string().optional(),

  electricity_accounts: z.coerce.number().optional().optional(),
  electricity_connection_numbers: z.string().optional(),
  electricity_water_security_deposit: z.coerce.number().optional().optional(),
  landline_numbers: z.string().optional(),
  internet_connection: z.string().optional(),

  cdc_expiry: z.string().optional().optional(),
  hassantuk_expiry: z.string().optional().optional(),
  approver_1: z.string().min(1, "Required"),
  approver_2: z.string().optional(),

});

export default function PropertySheet({ open, onOpenChange, propertyId , mode, formatDate, renewalColorHighlight, typeOptions}: PropertySheetProps) {

  const [files, setFiles] = useState<File[]>([]);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const navigate = useNavigate();

  const getFileName = (url: string) => {
  return url.split("/").pop();
};

  const saveDoc = useSaveDoc();
  const updateDoc = useUpdateDoc();
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isCreate = mode === "create";
  const formId = "property-form";

  const { data: propertyData,isLoading,refetch,} = useDocDetail<PropertyMaster>({
    doctype: "JH Property Master",
    name: propertyId || "",
    disabled: !propertyId,
  });

  const { data: renewalsData } = useDocs<RentalRenewal>({
    doctype: "JH Property Rental Renewal",
    filters: propertyId ? [["property", "=", propertyId]] : [],
    enabled: !!propertyId,
  });

  const hasExistingRenewals = !!(renewalsData && renewalsData.length > 0);
  const activeRenewal = renewalsData 
    ? renewalsData.sort((a: RentalRenewal, b: RentalRenewal) => 
        new Date(b.modified).getTime() - new Date(a.modified).getTime()
      )[0]?.name 
    : null;

  const { data: divisionData } = useDocs({
  doctype: "JH Division Master",
  });

  const { data: businessData } = useDocs({
    doctype: "JH Business Master",
  });

  const doc = propertyData?.docs?.[0] as PropertyMaster | undefined;

  const requiredFields = ["property_name", "renewal_date"];

  const {
  register,
  handleSubmit,
  reset,
  control,
  setValue,
  formState: { errors, isSubmitting, isValid, isDirty },
} = useForm({
  resolver: zodResolver(propertySchema),
  mode: "onChange",        
});

  const divisionWatch = useWatch({ 
    control,
    name: "division_used" 
  });

  const { data: usersData, isLoading: usersLoading, error: usersError } = useDocs<User>({
    doctype: "User",
    limit: 200,
    fields: ["name", "full_name", "email"]
  });

const { data: selectedDivisionData } = useDocs({
    doctype: "JH Division Master",
    fields: ["name", "division_head", "division_gm"],
    filters: divisionWatch ? [["name", "=", divisionWatch]] : [],
    limit: 1,
  });

  const selectedDivision = selectedDivisionData?.[0];

// Auto-fetch approvers when division changes (matches backend JS logic)
  useEffect(() => {
    const div = selectedDivision ?? selectedDivisionData?.[0];
    if (div?.division_head) {
      setValue("approver_1", div.division_head, { shouldValidate: true, shouldDirty: true });
      setValue("approver_2", div.division_gm || "", { shouldValidate: true, shouldDirty: true });
    } else if (div?.division_gm) {
      // Fallback if no head
      setValue("approver_1", div.division_gm, { shouldValidate: true, shouldDirty: true });
      setValue("approver_2", "", { shouldValidate: true, shouldDirty: true });
    }
  }, [selectedDivision, selectedDivisionData, setValue]);

   useEffect(() => {
  if (isCreate) {
    reset({
      country: "UAE",   //  default value
    });
  }
}, [isCreate, reset]);

  useEffect(() => {
    if (doc) {
      reset({
        ...doc,
        number_of_premises: doc.number_of_premises,
        electricity_connection_numbers: doc.electricity_connection_numbers,
        electricity_water_security_deposit: doc.electricity_water_security_deposit,
        cdc_expiry: doc.cdc_expiry,
        hassantuk_expiry: doc.hassantuk_expiry,
      });
    }
  }, [doc, reset]);

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

const onSubmit = async (data: any) => {
  try {
    let uploadedFiles: string[] = [];

    if (files.length > 0) {
      uploadedFiles = await Promise.all(
        files.map((file) => uploadFile(file))
      );
    }

    //  Convert to child table format
    const documents = uploadedFiles.map((url) => ({
      attachment: url,
    }));
    const payload = {
      ...data,
      renewal_date: formatDateForAPI(data.renewal_date),
      po_box_renewal_date: formatDateForAPI(data.po_box_renewal_date),
      cdc_expiry: formatDateForAPI(data.cdc_expiry),
      hassantuk_expiry: formatDateForAPI(data.hassantuk_expiry),
      doctype: "JH Property Master",
      documents
    };

    if (isEdit && propertyId) {
      await updateDoc.mutateAsync({
        doctype: "JH Property Master",
        name: propertyId,
        doc: payload,
      });

      toast.success("Property updated successfully");
    } else {
      await saveDoc.mutateAsync(payload);
      toast.success("Property created successfully");
    }

    await queryClient.invalidateQueries({ queryKey: ["Docs"] }); // refresh list
    onOpenChange(false);
    reset();
    refetch?.();
  } catch (error: any) {
    console.error(error);
    toast.error(error?.message || "Something went wrong");
  }
};

  const getHighlightColor = (date?: string) => {

    if (!date) return "text-gray-500";
    const days =
      (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);

    if (days < 30) return "text-red-500";
    return "text-black-400";
  };

  const propertyTypeOptions = ["Shop", "Office", "Warehouse", "Other"];

const renderApproverField = (
  label: string,
  name: keyof z.infer<typeof propertySchema>,
  value?: string,
  required = false
) => {
  return (
    <div className="flex flex-col gap-1">
      {!isView && (
        <Label className="text-sm text-gray-600">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}

{isView ? (
        <div className="flex items-center gap-2 py-1 text-sm">
          <span className="font-medium text-gray-600">{label}:</span>
          {usersLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : usersError || !usersData ? (
            <span className="text-gray-400 text-xs">Error loading user</span>
          ) : (() => {
            const user = usersData?.find((u: any) => u.name === value);
            const display = user?.email || value || "-";
            const tooltip = user?.full_name ? `${user.full_name} (${user.email || value})` : value || "No approver";
            return <span className="font-medium text-sm max-w-48 truncate" title={tooltip}>{display}</span>;
          })()}
        </div>
      ) : (
              <Controller
          name={name}
          control={control}
          render={({ field }) => {
            const selectedUser = usersData?.find((u: any) => u.name === field.value);
            const displayValue = selectedUser?.email || field.value || "";
            return (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between text-sm capitalize"
                  >
                    {displayValue || `Select ${label.toLowerCase()}`}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />

                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 max-h-64">
                  <Command>
                    <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
                    <CommandEmpty>No users found.</CommandEmpty>
                    <CommandGroup>
                      <CommandList>
                      {usersLoading ? (
                        <div className="p-4 text-center text-sm text-gray-500">Loading users...</div>
                      ) : usersError ? (
                        <div className="p-4 text-center text-sm text-red-500">Error loading users</div>
                      ) : !usersData?.length ? (
                        <div className="p-4 text-center text-sm text-gray-500">No users available</div>
                      ) : (
                        usersData.map((user: any) => (
                          <CommandItem
                            key={user.name}
                            value={user.name}
                            onSelect={() => {
                              field.onChange(user.name);
                            }}
                          >
                            <Check 
                              className={cn(
                                "mr-2 h-4 w-4", 
                                field.value === user.name 
                                  ? "opacity-100" 
                                  : "opacity-0"
                              )} 
                            />

                            <span className="truncate">{`${user.email} (${user.full_name ?? 'No name'})`}</span>
                          </CommandItem>
                        ))
                      )}
                      </CommandList>
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            );
          }}
        />

      )}
    </div>
  );
};

const renderField = (
  label: string,
  name: keyof z.infer<typeof propertySchema>,
  value?: string | number,
  type = "text"
) => {
  const isRequired = requiredFields.includes(name as string);

  return (
    <div className="flex flex-col gap-1">
      {!isView && (
        <Label className="text-sm text-gray-600">
          {label} {isRequired && <span className="text-red-500">*</span>}
        </Label>
      )}

      {isView ? (
        <div className="flex items-start gap-2 py-1 text-sm">
          <span className="font-medium text-gray-600">{label}:</span>
          <span>{value || "-"}</span>
        </div>
      ) : (
        <Controller
          name={name}
          control={control}
          defaultValue={value || ""}
          render={({ field }) => (
            <Input
              type={type}
              {...field}
              className={`${
                errors[name] ? "border-red-500" : ""
              }`}
            />
          )}
        />
      )}

      {/* Error message */}
      {/* {errors[name] && (
        <span className="text-red-500 text-xs">
          {errors[name]?.message as string}
        </span>
      )} */}
    </div>
  );
};

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-5xl px-5 pb-30">

        {/* Header */}
        <SheetHeader className="flex-row text-2xl justify-between items-center px-0 py-2">
          <SheetTitle>
            {isCreate ? "Create Property" : isEdit ? "Edit Property" : "Property Details"}

            <span className="pl-5">
               {/* Renewal card */}
          {(!isView && !isCreate) && (
            <>
              <Button 
                className="bg-primary text-white rounded-full" 
                onClick={() => {
                  if (hasExistingRenewals && activeRenewal) {
                    navigate("/jh-digitrack/property/renewals", { state: { openRenewal: activeRenewal } });
                  } else {
                    setIsRenewalModalOpen(true);
                  }
                }}
              >
                {hasExistingRenewals ? "View Active Renewal" : "Start Renewal"}
              </Button>
                <StartRenewalModal
                open={isRenewalModalOpen}
                onOpenChange={setIsRenewalModalOpen}
                propertyId={propertyId || ''}
                propertyName={doc?.property_name || ''}
                currentRent={doc?.current_rent}
                mode="new"
              />
            </>
          )}
            </span>
          </SheetTitle>
          
          <Button variant="ghost" size="icon"  onClick={() => onOpenChange(false)}>
            <XIcon className="size-4" />
          </Button>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] pr-3">
          <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">

            {/*  IDENTITY */}
            <h2 className="text-lg font-semibold">Identity</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {renderField("Property Name", "property_name", doc?.property_name)}
             <div className="flex flex-col gap-1">
                {!isView && (
                  <Label className="text-sm text-gray-600">
                    Property Type
                  </Label>
                )}

                {isView ? (
                  <div className="flex items-center gap-2 py-1 text-sm">
                    <span className="font-medium text-gray-600">Property Type:</span>
                    <span>{doc?.type_of_property || "-"}</span>
                  </div>
                ) : (
                  <Controller
                    name="type_of_property"
                    control={control}
                    render={({ field }) => (
                      <select {...field} className="border rounded px-2 py-2 text-sm">
                        <option value="">Select Type</option>
                        {propertyTypeOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                )}
              </div>

              {/* Business Used */}
              <div className="flex flex-col gap-1">
                {!isView && (
                  <Label className="text-sm text-gray-600">
                    Business Used
                  </Label>
                )}

                {isView ? (
                  <div className="flex items-center gap-2 py-1 text-sm">
                    <span className="font-medium text-gray-600">Business Used:</span>
                    <span>{doc?.business_used || "-"}</span>
                  </div>
                ) : (
                  <Controller
                    name="business_used"
                    control={control}
                    render={({ field }) => (
                      <select {...field} className="border rounded px-2 py-2 text-sm">
                        <option value="">Select Business</option>
                        {businessData?.map((business: any) => (
                          <option key={business.name} value={business.name}>
                            {business.name}
                          </option>
                        )) || []}
                      </select>
                    )}
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                {!isView && (
                  <Label className="text-sm text-gray-600">
                    Division Used
                  </Label>
                )}

                {isView ? (
                    <div className="flex items-center gap-2 py-1 text-sm">
                      <span className="font-medium text-gray-600">Division Used:</span>
                      <span>{doc?.division_used}</span>
                    </div>
                  ) : (
                    <Controller
                      name="division_used"
                      control={control}
                      render={({ field }) => (
                        <select {...field} className="border rounded px-2 py-2 text-sm">
                          <option value="">Select Division</option>
                          {divisionData?.map((div: any) => (
                            <option key={div.name} value={div.name}>
                              {div.name}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                  )}
              </div>
            {renderApproverField("Approver 1", "approver_1", doc?.approver_1, true)}
            {renderApproverField("Approver 2", "approver_2", doc?.approver_2, false)}
            {renderField("Booked Under", "booked_under", doc?.booked_under)}
            {renderField("Profit Center", "profit_center", doc?.profit_center)}
            {renderField("No. of Units", "number_of_units", doc?.number_of_units)}
            {renderField("No. of Premises", "number_of_premises", doc?.number_of_premises)}
            {renderField("Premise No", "premise_number", doc?.premise_number)}
            {renderField("Staff Allocated", "staff_allocated", doc?.staff_allocated)}
          </div>

            <Separator />

            {/*  LOCATION  */}
          <h2 className="text-lg font-semibold">Location</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {renderField("Location", "location", doc?.location)}
            {renderField("Emirate", "emirate", doc?.emirate)}
            {renderField("Country", "country", doc?.country)}
            {renderField("Makani Number", "makani_number", doc?.makani_number)}
            {renderField("PO Box", "po_box_number", doc?.po_box_number)}
            {renderField("PO Box Renewal", "po_box_renewal_date", doc?.po_box_renewal_date, "date")}
          </div>

            <Separator />

            {/*  LANDLORD  */}
            <h2 className="text-lg font-semibold">Landlord</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {renderField("Landlord", "landlord", doc?.landlord)}
              {renderField("Real Estate", "real_estate", doc?.real_estate)}
              {renderField("Current Rent", "current_rent", doc?.current_rent)}
              {isView ? (
              <div className="flex items-center gap-2 py-1 text-sm">
                <span className="font-medium text-gray-600">Renewal Date:</span>
                <span className={renewalColorHighlight?.(doc?.renewal_date)}>
                  {formatDate(doc?.renewal_date)}
                </span>
              </div>
            ) : (
              renderField("Renewal Date", "renewal_date", doc?.renewal_date, "date")
            )}
              {renderField("Landlord Security Deposit", "landlord_security_deposit", doc?.landlord_security_deposit)}
              {renderField("Tenancy Period", "tenancy_period", doc?.tenancy_period)}

               {isView ? (
              <div className="flex items-center gap-2 py-1 text-sm">
                <span className="font-medium text-gray-600">Lease start date:</span>
                <span className={doc?.lease_start_date}>
                  {formatDate(doc?.rlease_start_date)}
                </span>
              </div>
            ) : (
              renderField("Lease start date", "lease_start_date", doc?.lease_start_date, "date")
            )}
            </div>

            <Separator />

            {/*  UTILITIES  */}
            <h2 className="text-lg font-semibold">Utilities</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {renderField("Electricity Accounts", "electricity_accounts", doc?.electricity_accounts)}
              
              {renderField(
                "Connection No",
                "electricity_connection_numbers",
                doc?.electricity_connection_numbers
              )}

              {renderField(
                "Electricity / Water Security Deposit",
                "electricity_water_security_deposit",
                doc?.electricity_water_security_deposit
              )}


              {renderField("Landline Numbers", "landline_numbers", doc?.landline_numbers)}
              
              {renderField("Internet Connection", "internet_connection", doc?.internet_connection)}
            </div>

            <Separator />

            {/*  COMPLIANCE  */}
            <h2 className="text-lg font-semibold">Compliance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isView ? (
                <div className="flex items-center gap-2 py-1 text-sm">
                  <span className="font-medium text-gray-600">CDC Expiry:</span>
                  <span className={getHighlightColor?.(doc?.cdc_expiry)}>
                    {formatDate(doc?.cdc_expiry)}
                  </span>
                </div>
                ) : (
                  renderField("CDC Expiry", "cdc_expiry", doc?.cdc_expiry, "date")
                )}
                {isView ? (
                <div className="flex items-center gap-2 py-1 text-sm">
                  <span className="font-medium text-gray-600">Hassantuk Expiry:</span>
                  <span className={getHighlightColor?.(doc?.hassantuk_expiry)}>
                    {formatDate(doc?.hassantuk_expiry)}
                  </span>
                </div>
                ) : (
                  renderField("Hassantuk Expiry", "hassantuk_expiry", doc?.hassantuk_expiry, "date")
                )}

            </div>

            <Separator />

            {/*  DOCUMENTS  */}
            <h2 className="text-lg font-semibold">Documents</h2>

            {isView ? (
                <div className="space-y-2 mb-10">
              {doc?.documents?.length > 0 ? (
                    doc!.documents!.map((file: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 px-3">
                        <span className="text-sm text-gray-700">
                          {getFileName(file.attachment)}
                        </span>

                        <a
                          href={file.attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 text-sm underline"
                        >
                          View
                        </a>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No documents available</p>
                  )}
                </div>
              ) : (
                <>
                  {/*  Existing files */}
                  {doc?.documents?.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <p className="text-sm font-medium text-gray-600">Existing Files</p>

                  {doc.documents!.map((file: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 px-3">
                          <span className="text-sm text-gray-700">
                            {getFileName(file.attachment)}
                          </span>

                          <a
                            href={file.attachment}
                            target="_blank"
                            className="text-blue-600 text-sm underline"
                          >
                            View
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  {/*  Upload new files */}
                  <FileAttachment files={files} setFiles={setFiles} />
                </>
              )}

            <Separator/>
            
            <div className="mb-30">
              <h3 className="font-semibold">Renewal History</h3>
            </div>

          </form>
        </ScrollArea>

        {/* Footer */}
       <SheetFooter className="absolute bottom-0 w-full bg-white px-5">
          <div className="flex w-full gap-2">

            {!isView && 
              <>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>

               <Button
                  type="submit"
                  form={formId}
                  disabled={
                    isSubmitting || !isValid  
                  }
                  className="w-full bg-[#972e26] hover:bg-[#972e26]/90"
                >
                  {isSubmitting
                    ? "Saving..."
                    : isEdit
                    ? "Update Property"
                    : "Create Property"}
                </Button>
              </>
            }

          </div>
        </SheetFooter>

      </SheetContent>
    </Sheet>
  );
}