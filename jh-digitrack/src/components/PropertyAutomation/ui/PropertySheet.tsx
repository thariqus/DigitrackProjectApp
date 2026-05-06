
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ChevronsUpDown, XIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
 
import { Controller, useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
 
import FileAttachment from "./FileAttachment";
import MultiValueInput from "./MultiValueInput";
import StartRenewalModal from "./StartRenewalModal";
import { useDocs, useSaveDoc, useUpdateDoc } from "@/hooks/doc";
import { usePropertyDoc, useRenewalList } from "../hooks/useProperty";
import { PropertyMaster, JHPropertyElectricityConnection, JHPropertyLandline } from "@/types/JHDigitrack/JHPropertyAutomation";
import { X } from "lucide-react";
import { queryClient } from "@/utils/query-client";
import RenewalTimeline from "./RenewalTimeline";
 
type PropertySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string | null;
  mode: "view" | "edit" | "create";
  formatDate: (date?: string) => string;
  renewalColorHighlight: (date?: string) => string;
  typeOptions: string[];
  hasPermisssionToViewRenewalHistory:boolean;
};
 
type UserOption = {
  name: string;
  full_name?: string;
  email?: string;
};
 
type NamedOption = {
  name: string;
};

const requiredNumberField = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z.number({
    required_error: "Required field",
    invalid_type_error: "Required",
  })
);
 
const propertySchema = z.object({
  property_name: z.string().min(1, "Required field"),
  type_of_property: z.string().nullable().optional(),
  business_used: z.string().nullable().optional(),
  division_used: z.string().nullable().optional(),
  booked_under: z.string().nullable().optional(),
  profit_center: z.string().nullable().optional(),
  number_of_units: z.coerce.number().optional(),
  number_of_premises: z.coerce.number().optional(),
  premise_number: z.string().nullable().optional(),
  staff_allocated: z.string().nullable().optional(),
 
  location: z.string().nullable().optional(),
  emirate: z.string().nullable().optional(),
  country: z.string().default("UAE").optional(),
  makani_number: z.string().nullable().optional(),
  po_box_number: z.string().nullable().optional(),
  po_box_renewal_date: z.string().nullable().optional(),
 
  landlord: z.string().nullable().optional(),
  real_estate: z.string().nullable().optional(),
  current_rent: requiredNumberField,
  renewal_date: z.string().min(1, "Required field"),
  landlord_security_deposit: z.coerce.number().optional(),
  tenancy_period: z.string().optional().refine((val) => {
    if (!val) return true;
    const match = val.match(/^(\d+)\s+(Months?|Weeks?|Years?)$/i);
    return !!match && parseInt(match[1], 10) > 0;
  }, {
    message: "Must be number followed by Months, Weeks, or Years (e.g. '12 Months')"
  }),
  lease_start_date: z.string().nullable().optional(),
 
  electricity_accounts: z.coerce.number().optional(),
  electricity_connections: z.array(z.object({
    connection_number: z.string().min(1, "Connection Number required"),
    meter_id: z.string().optional(),
    account_number: z.string().optional(),
    connection_type: z.enum(["Electricity", "Water", "Dual"]).optional(),
  })).optional(),
  electricity_connection_numbers: z.string().nullable().optional(),
  electricity_water_security_deposit: z.coerce.number().optional(),
  landline_connections: z.array(z.object({
    landline_number: z.string().min(1, "Landline Number required"),
    provider: z.string().optional(),
    line_type: z.enum(["Fixed", "Fax"]).optional(),
  })).optional(),
  landline_accounts: z.coerce.number().optional(),
  internet_connection: z.string().nullable().optional(),
 
  cdc_expiry: z.string().optional(),
  hassantuk_expiry: z.string().optional(),
  approver_1: z.string().min(1, "Required field"),
  approver_2: z.string().nullable().optional(),
});

type PropertyFormValues = z.infer<typeof propertySchema> & {
  electricity_connections: JHPropertyElectricityConnection[];
  landline_connections: JHPropertyLandline[];
};

  const getEmptyPropertyFormValues = (): PropertyFormValues => ({
  property_name: "",
  type_of_property: "",
  business_used: "",
  division_used: "",
  booked_under: "",
  profit_center: "",
  number_of_units: undefined,
  number_of_premises: undefined,
  premise_number: "",
  staff_allocated: "",
  location: "",
  emirate: "",
  country: "UAE",
  makani_number: "",
  po_box_number: "",
  po_box_renewal_date: "",
  landlord: "",
  real_estate: "",
  current_rent: undefined,
  renewal_date: "",
  landlord_security_deposit: undefined,
  tenancy_period: "",
  lease_start_date: "",
  electricity_accounts: undefined,
  electricity_connections: [],
  electricity_connection_numbers: "",
  electricity_water_security_deposit: undefined,
  landline_connections: [],
  landline_accounts: undefined,
  internet_connection: "",
  cdc_expiry: "",
  hassantuk_expiry: "",
  approver_1: "",
  approver_2: "",
});

const getMultiValueItems = (value?: string | null) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
 
export default function PropertySheet({
  open,
  onOpenChange,
  propertyId,
  mode,
  formatDate,
  renewalColorHighlight,
  hasPermisssionToViewRenewalHistory
}: PropertySheetProps) {
 
  const [files, setFiles] = useState<File[]>([]);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [approver1Search, setApprover1Search] = useState("");
  const [approver2Search, setApprover2Search] = useState("");
  const [openApproverField, setOpenApproverField] = useState<"approver_1" | "approver_2" | null>(null);
  const [connections, setConnections] = useState<JHPropertyElectricityConnection[]>([]);
  const [landlineConnections, setLandlineConnections] = useState<JHPropertyLandline[]>([]);
  const lastAutoFilledDivisionRef = useRef<string | null>(null);
  const approverFieldRefs = useRef<Partial<Record<"approver_1" | "approver_2", HTMLDivElement | null>>>({});
  const navigate = useNavigate();
 
  const saveDoc = useSaveDoc();
  const updateDoc = useUpdateDoc();

  console.log(hasPermisssionToViewRenewalHistory,"hasPermisssionToViewRenewalHistory")
  console.log(mode,"mode")
  console.log(propertyId, "propertyId");
 
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isCreate = mode === "create";
  const formId = "property-form";
 
  const { data: propertyData, isFetching: isPropertyFetching } = usePropertyDoc(propertyId);
  const { data: renewalsListData,refetch: refetchRenewals } = useRenewalList(
  {
    property: propertyId || undefined,
    limit: 50,
    page: 1,
  },
  !!propertyId
);
const renewalsData = renewalsListData?.renewals ?? [];
 
  const doc = propertyData?.doc as PropertyMaster | undefined;
 
  const hasExistingRenewals = renewalsData.length > 0;
  const activeRenewal = renewalsData.length
    ? [...renewalsData].sort(
        (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()
      )[0]?.name
    : null;
 
  const { data: divisionData } = useDocs({
    doctype: "JH Division Master",
  });
 
  const { data: businessData } = useDocs({
    doctype: "JH Business Master",
  });
 
  const { data: usersData, isLoading: usersLoading, error: usersError } = useDocs<UserOption>({
    doctype: "User",
    limit: 200,
    fields: ["name", "full_name", "email"],
  });
 
  const {
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(propertySchema),
    mode: "onChange",
    defaultValues: getEmptyPropertyFormValues(),
  });
 
  const divisionWatch = useWatch({
    control,
    name: "division_used",
  });
 
  const { data: selectedDivisionData } = useDocs({
    doctype: "JH Division Master",
    fields: ["name", "division_head", "division_gm"],
    filters: divisionWatch ? [["name", "=", divisionWatch]] : [],
    limit: 1,
  });
 
  const selectedDivision = selectedDivisionData?.[0];

const resetSheetState = useCallback((values: PropertyFormValues = getEmptyPropertyFormValues()) => {
    setFiles([]);
    setApprover1Search("");
    setApprover2Search("");
    setOpenApproverField(null);
    reset(values);
    setConnections(values.electricity_connections || []);
    setLandlineConnections(values.landline_connections || []);
  }, [reset]);

  const handleSheetOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      lastAutoFilledDivisionRef.current = null;
      resetSheetState();
    }

    onOpenChange(nextOpen);
  };

  useEffect(() => {
    if (!open) return;
    resetSheetState();
 
    if (isCreate) {
      lastAutoFilledDivisionRef.current = null;
      return;
    }

    if (doc) {
      lastAutoFilledDivisionRef.current = doc.division_used ?? null;
      setConnections(doc.electricity_connections || []);
      setLandlineConnections(doc.landline_connections || []);
      resetSheetState({
        ...getEmptyPropertyFormValues(),
        ...doc,
        electricity_connections: doc.electricity_connections || [],
        landline_connections: doc.landline_connections || [],
        renewal_date: doc.renewal_date?.split("T")[0],
        lease_start_date: doc.lease_start_date?.split("T")[0],
        po_box_renewal_date: doc.po_box_renewal_date?.split("T")[0],
        cdc_expiry: doc.cdc_expiry?.split("T")[0],
        hassantuk_expiry: doc.hassantuk_expiry?.split("T")[0],
      });
    }
  }, [open, isCreate, doc, resetSheetState]);
 
// Handle outside click to close approver dropdown
  useEffect(() => {
    if (!open || !openApproverField) return;

    const handlePointerDown = (event: MouseEvent) => {
      const activeContainer = approverFieldRefs.current[openApproverField];
      if (activeContainer && !activeContainer.contains(event.target as Node)) {
        setOpenApproverField(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open, openApproverField]);
 
  useEffect(() => {
    if (!open || !divisionWatch) return;
 
    const div = selectedDivision ?? selectedDivisionData?.[0];
    if (!div || lastAutoFilledDivisionRef.current === divisionWatch) return;
 
    if (div?.division_head) {
      setValue("approver_1", div.division_head, { shouldValidate: true, shouldDirty: true });
      setValue("approver_2", div.division_gm || "", { shouldValidate: true, shouldDirty: true });
    } else if (div?.division_gm) {
      setValue("approver_1", div.division_gm, { shouldValidate: true, shouldDirty: true });
      setValue("approver_2", "", { shouldValidate: true, shouldDirty: true });
    } else {
      setValue("approver_1", "", { shouldValidate: true, shouldDirty: true });
      setValue("approver_2", "", { shouldValidate: true, shouldDirty: true });
    }
 
    lastAutoFilledDivisionRef.current = divisionWatch;
  }, [divisionWatch, open, selectedDivision, selectedDivisionData, setValue]);
 
  const userOptions = useMemo(
    () =>
      (usersData ?? []).map((user) => ({
        value: user.name,
        label: user.full_name ? `${user.email} (${user.full_name})` : user.email || user.name,
      })),
    [usersData]
  );
 
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
 
  const onSubmit = async (data: PropertyFormValues) => {
    const formData = {
      ...data,
      electricity_connections: connections.map((conn, index) => ({
        doctype: "JH Property Electricity Connection",
        ...conn,
        idx: index + 1,
      })),
      landline_connections: landlineConnections.map((conn, index) => ({
        doctype: "JH Property Landline",
        ...conn,
        idx: index + 1,
      })),
      landline_accounts: landlineConnections.length || 0,
      electricity_accounts: connections.length || 0,
    } as any;

    console.log("Property save payload:", JSON.stringify(formData, null, 2));

    if (isCreate && data.renewal_date && new Date(data.renewal_date) <= new Date()) {
      toast.error("Renewal Date must be a future date");
      return;
    }
    
    try {
      const uploadedFiles =
        files.length > 0 ? await Promise.all(files.map((file) => uploadFile(file))) : [];
 
      const documents = [
        ...(doc?.documents || []),
        ...uploadedFiles.map((url) => ({ attachment: url })),
      ];
 
      const payload = {
        ...formData,
        name: propertyId,
        renewal_date: formatDateForAPI(data.renewal_date),
        po_box_renewal_date: formatDateForAPI(data.po_box_renewal_date),
        cdc_expiry: formatDateForAPI(data.cdc_expiry),
        hassantuk_expiry: formatDateForAPI(data.hassantuk_expiry),
        doctype: "JH Property Master",
        documents,
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
 
      await queryClient.invalidateQueries({ queryKey: ["PropertyList"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["PropertyDashboardCounts"] });
      await queryClient.invalidateQueries({ queryKey: ["PropertyDoc", propertyId] });
      // Force refetch for immediate UI update
      await queryClient.refetchQueries({ queryKey: ["PropertyDoc", propertyId] });
      await queryClient.invalidateQueries({ queryKey: ["RenewalList"], exact: false });
 
      handleSheetOpenChange(false);
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  };
 
  const requiredFields = ["property_name", "current_rent", "renewal_date"];
 
  const getFileName = (url: string) => url.split("/").pop() || "";
 
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
            render={({ field }) => (
              <Input
                type={type}
                {...field}
                value={field.value ?? ""}
                className={errors[name] ? "border-red-500" : ""}
              />
            )}
          />
        )}
 
        {errors[name] && (
          <span className="text-red-500 text-xs">{errors[name]?.message as string}</span>
        )}
      </div>
    );
  };
 
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
                const user = usersData?.find((u) => u.name === value);
                const display = user?.email || value || "-";
                const tooltip = user?.full_name
                  ? `${user.full_name} (${user.email || value})`
                  : value || "No approver";
                return (
                  <span className="font-medium text-sm max-w-48 truncate" title={tooltip}>
                    {display}
                  </span>
                );
              })()}
          </div>
        ) : (
          <Controller
            name={name}
            control={control}
            render={({ field }) => {
              const selectedUser = usersData?.find((u) => u.name === field.value);
              const displayValue = selectedUser?.email || field.value || "";
              const searchValue = name === "approver_1" ? approver1Search : approver2Search;
              const setSearchValue = name === "approver_1" ? setApprover1Search : setApprover2Search;
              const filteredUserOptions = userOptions.filter((option) =>
                option.label.toLowerCase().includes(searchValue.toLowerCase())
              );
              const isOpen = openApproverField === name;
 
              return (
                <div
                  ref={(node) => {
                    approverFieldRefs.current[name as "approver_1" | "approver_2"] = node;
                  }}
                  className="relative"
                >
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={isOpen}
                    disabled={usersLoading || !!usersError}
                    className={cn(
                      "w-full justify-between text-sm",
                      errors[name] ? "border-red-500" : ""
                    )}
                    onClick={() => {
                      const nextOpen = !isOpen;
                      setOpenApproverField(nextOpen ? (name as "approver_1" | "approver_2") : null);
                      if (!nextOpen) {
                        setSearchValue("");
                      }
                    }}
                  >
                    {displayValue || `Select ${label.toLowerCase()}`}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
 
                  {isOpen && (
                    <div className="bg-popover text-popover-foreground absolute left-0 top-full z-50 mt-1 w-full rounded-md border shadow-md">
                      <div className="border-b p-2">
                        <Input
                          value={searchValue}
                          onChange={(event) => setSearchValue(event.target.value)}
                          placeholder={`Search ${label.toLowerCase()}...`}
                          className="h-9"
                          autoFocus
                        />
                      </div>
 
                      <div className="max-h-[300px] overflow-y-auto p-1">
                        {usersLoading ? (
                          <div className="px-2 py-3 text-sm text-gray-500">Loading users...</div>
                        ) : usersError ? (
                          <div className="px-2 py-3 text-sm text-red-500">Error loading users</div>
                        ) : filteredUserOptions.length === 0 ? (
                          <div className="px-2 py-3 text-sm text-gray-500">No users found.</div>
                        ) : (
                          filteredUserOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              className={cn(
                                "hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                                field.value === option.value ? "bg-accent text-accent-foreground" : ""
                              )}
                              onMouseDown={(event) => {
                                event.preventDefault();
                                field.onChange(option.value);
                                setSearchValue("");
                                setOpenApproverField(null);
                              }}
                            >
                              <Check
                                className={cn(
                                  "h-4 w-4 shrink-0",
                                  field.value === option.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="truncate">{option.label}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            }}
          />
        )}
      </div>
    );
  };

  const renderMultiValueField = (
    label: string,
    name: "premise_number" | "electricity_connection_numbers",
    value?: string
  ) => {
    const items = getMultiValueItems(value);

    return (
      <div className="flex flex-col gap-1">
        {!isView && <Label className="text-sm text-gray-600 text-nowrap">{label} 
                      <span className="text-xs text-gray-400">({`Type and press Enter`})</span>
                     </Label>}

        {isView ? (
          <div className="flex items-start gap-2 py-1 text-sm">
            <span className="font-medium text-gray-600">{label}:</span>
            {items.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {items.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <span>-</span>
            )}
          </div>
        ) : (
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <MultiValueInput
                value={field.value}
                onChange={field.onChange}
                // placeholder={`Enter ${label.toLowerCase()} and press Enter`}
                className={errors[name] ? "border-red-500" : ""}
              />
            )}
          />
        )}

        {errors[name] && (
          <span className="text-red-500 text-xs">{errors[name]?.message as string}</span>
        )}
      </div>
    );
  };


  const renderLandlineConnections = (
  isViewMode: boolean,
  connectionsData?: JHPropertyLandline[]
) => {
  const data = isViewMode ? (connectionsData || []) : landlineConnections;
  const isLoading = isViewMode && isPropertyFetching;

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-sm text-gray-600">Landline Connections</Label>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-2">
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground p-3 border-2 border-dashed rounded-lg text-center">
              {isViewMode ? "No connections" : "Click + Add Landline to start"}
            </p>
          ) : (
            data.map((conn, index) => (
              <div
                key={conn.name || index}
                className="flex gap-2 items-end bg-muted p-3 rounded-lg"
              >
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className={`${isView ? "flex items-center gap-1": "flex  flex-col gap-1"}`}>
                    <Label className="text-xs">Landline Number: <span className="text-red-500">*</span></Label>
                    {isViewMode ? (
                      <span className="text-sm font-medium">
                        {conn.landline_number || "-"}
                      </span>
                    ) : (
                      <Input
                        value={conn.landline_number || ""}
                        onChange={(e) => {
                          const newConns = [...landlineConnections];
                          newConns[index].landline_number = e.target.value;
                          setLandlineConnections(newConns);
                          setValue("landline_accounts", newConns.length);
                        }}
                        className="text-sm"
                      />
                    )}
                  </div>

                  <div className={`${isView ? "flex items-center gap-1": "flex  flex-col gap-1"}`}>
                    <Label className="text-xs">Provider:</Label>
                    {isViewMode ? (
                      <span className="text-sm">{conn.provider || "-"}</span>
                    ) : (
                      <Input
                        value={conn.provider || ""}
                        onChange={(e) => {
                          const newConns = [...landlineConnections];
                          newConns[index].provider = e.target.value;
                          setLandlineConnections(newConns);
                        }}
                        className="text-sm"
                      />
                    )}
                  </div>

                  <div className={`${isView ? "flex items-center gap-1": "flex  flex-col gap-1"}`}>
                    <Label className="text-xs">Line Type:</Label>
                    {isViewMode ? (
                      <span className="text-sm font-medium">
                        {conn.line_type || "-"}
                      </span>
                    ) : (
                      <Select
                        value={conn.line_type || ""}
                        onValueChange={(value) => {
                          const newConns = [...landlineConnections];
                          newConns[index].line_type = value;
                          setLandlineConnections(newConns);
                        }}
                      >
                        <SelectTrigger className="text-sm h-9">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Fixed">Fixed</SelectItem>
                          <SelectItem value="Fax">Fax</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {!isViewMode && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 p-0 -mr-2"
                    onClick={() => {
                      const newConns = landlineConnections.filter((_, i) => i !== index);
                      setLandlineConnections(newConns);
                      setValue("landline_accounts", newConns.length);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}

          {!isViewMode && (
            <Button
              type="button"
              variant="outline"
              className="w-full border-2 border-dashed h-10 text-sm"
              onClick={() => {
                const newConns = [...landlineConnections, { landline_number: "" }];
                setLandlineConnections(newConns);
                setValue("landline_accounts", newConns.length);
              }}
            >
              + Add Landline
            </Button>
          )}
        </div>
      )}

      {errors.landline_accounts && (
        <span className="text-red-500 text-xs">
          {errors.landline_accounts.message}
        </span>
      )}
    </div>
  );
};

  const renderElectricityConnections = (
  isViewMode: boolean,
  connectionsData?: JHPropertyElectricityConnection[]
) => {
  const data = isViewMode ? (connectionsData || []) : connections;
  const isLoading = isViewMode && isPropertyFetching;

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-sm text-gray-600">Electricity Connections:</Label>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-2">
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground p-3 border-2 border-dashed rounded-lg text-center">
              {isViewMode ? "No connections" : "Click + Add Connection to start"}
            </p>
          ) : (
            data.map((conn, index) => (
              <div
                key={conn.name || index}
                className="flex gap-2 items-end bg-muted p-3 rounded-lg"
              >
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div className={`${isView ? "flex items-center gap-1": "flex  flex-col gap-1"}`}>
                    <Label className="text-xs">Connection Number:</Label>
                    {isViewMode ? (
                      <span className="text-sm font-medium">
                        {conn.connection_number || "-"}
                      </span>
                    ) : (
                      <Input
                        value={conn.connection_number || ""}
                        onChange={(e) => {
                          const newConns = [...connections];
                          newConns[index].connection_number = e.target.value;
                          setConnections(newConns);
                          setValue("electricity_accounts", newConns.length);
                        }}
                        className="text-sm"
                      />
                    )}
                  </div>

                  <div className={`${isView ? "flex items-center gap-1": "flex  flex-col gap-1"}`}>
                    <Label className="text-xs">Meter ID:</Label>
                    {isViewMode ? (
                      <span className="text-sm">{conn.meter_id || "-"}</span>
                    ) : (
                      <Input
                        value={conn.meter_id || ""}
                        onChange={(e) => {
                          const newConns = [...connections];
                          newConns[index].meter_id = e.target.value;
                          setConnections(newConns);
                        }}
                        className="text-sm"
                      />
                    )}
                  </div>

                 <div className={`${isView ? "flex items-center gap-1": "flex  flex-col gap-1"}`}>
                    <Label className="text-xs">Account Number:</Label>
                    {isViewMode ? (
                      <span className="text-sm">
                        {conn.account_number || "-"}
                      </span>
                    ) : (
                      <Input
                        value={conn.account_number || ""}
                        onChange={(e) => {
                          const newConns = [...connections];
                          newConns[index].account_number = e.target.value;
                          setConnections(newConns);
                        }}
                        className="text-sm"
                      />
                    )}
                  </div>

                  <div className={`${isView ? "flex items-center gap-1": "flex  flex-col gap-1"}`}>
                    <Label className="text-xs">Type:</Label>
                    {isViewMode ? (
                      <span className="text-sm font-medium">
                        {conn.connection_type || "-"}
                      </span>
                    ) : (
                      <Select
                        value={conn.connection_type || ""}
                        onValueChange={(value) => {
                          const newConns = [...connections];
                          newConns[index].connection_type = value as any;
                          setConnections(newConns);
                        }}
                      >
                        <SelectTrigger className="text-sm h-9">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Electricity">
                            Electricity
                          </SelectItem>
                          <SelectItem value="Water">Water</SelectItem>
                          <SelectItem value="Dual">Dual</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {!isViewMode && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 p-0 -mr-2"
                    onClick={() => {
                      const newConns = connections.filter((_, i) => i !== index);
                      setConnections(newConns);
                      setValue("electricity_accounts", newConns.length);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}

          {!isViewMode && (
            <Button
              type="button"
              variant="outline"
              className="w-full border-2 border-dashed h-10 text-sm"
              onClick={() => {
                const newConns = [...connections, { connection_number: "" }];
                setConnections(newConns);
                setValue("electricity_accounts", newConns.length);
              }}
            >
              + Add Connection
            </Button>
          )}
        </div>
      )}

      {errors.electricity_accounts && (
        <span className="text-red-500 text-xs">
          {errors.electricity_accounts.message}
        </span>
      )}
    </div>
  );
};

  const renderTenancyPeriodField = (
    label: string,
    name: keyof z.infer<typeof propertySchema>,
    value?: string | null
  ) => {
    const [tenancyValue, tenancyUnit] = useMemo(() => {
      if (!value) return [undefined, "Months"] as [number | undefined, string];
      const match = value.match(/^(\d+)\s*(Months?|Weeks?|Years?)$/i);
      return match 
        ? [parseInt(match[1], 10), match[2] || "Months"] 
        : [undefined, "Months"];
    }, [value]);

    return (
      <div className="flex flex-col gap-1">
        {!isView && (
          <Label className="text-sm text-gray-600">
            {label}
          </Label>
        )}

        {isView ? (
          <div className="flex items-start gap-2 py-1 text-sm">
            <span className="font-medium text-gray-600">{label}:</span>
            <span>{value || "-"}</span>
          </div>
        ) : (
          <Controller
            key={name as string} // Force remount on value change
            name={name}
            control={control}
            render={({ field }) => {
              const [numVal, unitVal] = useMemo(() => {
                if (!field.value) return ["" as string, "Months" as string];
                const match = field.value.match(/^(\d+)\s*(Months?|Weeks?|Years?)$/i);
                return match 
                  ? [match[1], match[2] || "Months"] 
                  : ["", "Months"];
              }, [field.value]);

              const handleValueChange = (newNum: string) => {
                const num = parseInt(newNum, 10);
                const combined = num > 0 ? `${num} ${unitVal}` : "";
                field.onChange(combined);
              };

              const handleUnitChange = (newUnit: string) => {
                const num = parseInt(numVal, 10);
                const combined = num > 0 ? `${num} ${newUnit}` : "";
                field.onChange(combined);
              };

              return (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={numVal}
                    onChange={(e) => handleValueChange(e.target.value)}
                    placeholder="0"
                    className={cn(
                      "flex-1",
                      errors[name] && "border-red-500"
                    )}
                  />
                  <Select value={unitVal} onValueChange={handleUnitChange}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Months">Months</SelectItem>
                      <SelectItem value="Weeks">Weeks</SelectItem>
                      <SelectItem value="Years">Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            }}
          />
        )}

        {errors[name] && (
          <span className="text-red-500 text-xs">{errors[name]?.message as string}</span>
        )}
      </div>
    );
  };

  
 
  const propertyTypeOptions =["Shop", "Villa", "Flat", "Other"];
 
  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="sm:max-w-5xl px-5 pb-30">
        <SheetHeader className="flex-row text-2xl justify-between items-center px-0 py-2">
          <div className="flex items-center gap-5">
            <SheetTitle>
              {isCreate ? "Create Property" : isEdit ? "Edit Property" : "Property Details"}
            </SheetTitle>
 
             <div className="">
              {!isView && !isCreate && (
                <>
                  <Button
                    className="bg-primary text-white rounded-full"
                    type="button"
                    onClick={() => {
                      if (hasExistingRenewals && activeRenewal) {
                        navigate("/jh-digitrack/property/renewals", {
                          state: { openRenewal: activeRenewal },
                        });
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
                    propertyId={propertyId || ""}
                    propertyName={doc?.property_name || ""}
                    currentRent={doc?.current_rent}
                    mode="new"
                    onCreated={async () => {
                      await refetchRenewals();
                      await queryClient.invalidateQueries({
                        queryKey: ["RenewalList"],
                        exact: false,
                      });
                    }}
                  />
                </>
              )}
            </div>
 
          </div>
 
          <Button variant="ghost" size="icon" onClick={() => handleSheetOpenChange(false)}>
            <XIcon className="size-4" />
          </Button>
        </SheetHeader>
 
        <ScrollArea className="h-[calc(100vh-100px)] pr-3">
          <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
 
            <h2 className="text-lg font-semibold">Identity</h2>
 
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {renderField("Property Name", "property_name", doc?.property_name)}
 
              <div className="flex flex-col gap-1">
                {!isView && <Label className="text-sm text-gray-600">Property Type</Label>}
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
 
              <div className="flex flex-col gap-1">
                {!isView && <Label className="text-sm text-gray-600">Business Used</Label>}
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
                        {businessData?.map((business: NamedOption) => (
                          <option key={business.name} value={business.name}>
                            {business.name}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                )}
              </div>
 
              <div className="flex flex-col gap-1">
                {!isView && <Label className="text-sm text-gray-600">Division Used</Label>}
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
                        {divisionData?.map((div: NamedOption) => (
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
              {renderApproverField("Approver 2", "approver_2", doc?.approver_2)}
              {renderField("Booked Under", "booked_under", doc?.booked_under)}
              {renderField("Profit Center", "profit_center", doc?.profit_center)}
              {renderField("No. of Units", "number_of_units", doc?.number_of_units)}
              {renderField("No. of Premises", "number_of_premises", doc?.number_of_premises)}
              {renderMultiValueField("Premise No", "premise_number", doc?.premise_number)}
              {renderField("Staff Allocated", "staff_allocated", doc?.staff_allocated)}
            </div>
 
            <Separator />
 
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
 
              {renderField(
                "Landlord Security Deposit",
                "landlord_security_deposit",
                doc?.landlord_security_deposit
              )}
              {renderTenancyPeriodField("Tenancy Period", "tenancy_period", doc?.tenancy_period)}

              {isView ? (
                <div className="flex items-center gap-2 py-1 text-sm">
                  <span className="font-medium text-gray-600">Lease start date:</span>
                  <span>{formatDate(doc?.lease_start_date)}</span>
                </div>
              ) : (
                renderField("Lease start date", "lease_start_date", doc?.lease_start_date, "date")
              )}
            </div>
 
            <Separator />
 
            <h2 className="text-lg font-semibold">Utilities</h2>
            <div className={`grid grid-cols-1 ${isView ? "md:grid-cols-3" : "md:grid-cols-4"} gap-3`}>
              {renderField("Electricity Accounts", "electricity_accounts", doc?.electricity_accounts)}
              {renderField(
                "Electricity / Water Security Deposit",
                "electricity_water_security_deposit",
                doc?.electricity_water_security_deposit
              )}
              {renderField("Landline Accounts", "landline_accounts", doc?.landline_accounts)}
              {renderField("Internet Connection", "internet_connection", doc?.internet_connection)}
            </div>
            {renderLandlineConnections(isView, doc?.landline_connections)}
            {renderElectricityConnections(isView, doc?.electricity_connections)}
 
 
            <h2 className="text-lg font-semibold">Compliance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isView ? (
                <div className="flex items-center gap-2 py-1 text-sm">
                  <span className="font-medium text-gray-600">CDC Expiry:</span>
                  <span className={renewalColorHighlight?.(doc?.cdc_expiry)}>
                    {formatDate(doc?.cdc_expiry)}
                  </span>
                </div>
              ) : (
                renderField("CDC Expiry", "cdc_expiry", doc?.cdc_expiry, "date")
              )}
 
              {isView ? (
                <div className="flex items-center gap-2 py-1 text-sm">
                  <span className="font-medium text-gray-600">Hassantuk Expiry:</span>
                  <span className={renewalColorHighlight?.(doc?.hassantuk_expiry)}>
                    {formatDate(doc?.hassantuk_expiry)}
                  </span>
                </div>
              ) : (
                renderField("Hassantuk Expiry", "hassantuk_expiry", doc?.hassantuk_expiry, "date")
              )}
            </div>
 
            <Separator />
 
            <h2 className="text-lg font-semibold">Documents</h2>
 
            {isView ? (
              <div className="space-y-2 mb-10">
                {doc?.documents?.length ? (
                  doc.documents.map((file, index: number) => (
                    <div key={index} className="flex items-center gap-2 px-3">
                      <span className="text-sm text-gray-700">{getFileName(file.attachment)}</span>
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
                {doc?.documents?.length ? (
                  <div className="space-y-2 mb-4">
                    <p className="text-sm font-medium text-gray-600">Existing Files</p>
                    {doc.documents.map((file, index: number) => (
                      <div key={index} className="flex items-center gap-2 px-3">
                        <span className="text-sm text-gray-700">{getFileName(file.attachment)}</span>
                        <a
                          href={file.attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 text-sm underline"
                        >
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                ) : null}
 
                <FileAttachment files={files} setFiles={setFiles} />
              </>
            )}
 
             {hasPermisssionToViewRenewalHistory && propertyId && mode === "view" && (
              <>
                    <RenewalTimeline renewalId={activeRenewal} defaultOpen={true} title="Renewal history"/>
              </> 
              )}
          </form>
        </ScrollArea>
 
        <SheetFooter className="absolute bottom-0 w-full bg-white px-5">
          <div className="flex w-full gap-2">
            {!isView && (
              <>
                <Button variant="outline" className="w-full" type="button" onClick={() => handleSheetOpenChange(false)}>
                  Cancel
                </Button>
 
                <Button
                  type="submit"
                  form={formId}
                  disabled={isSubmitting || hasExistingRenewals}
                  className="w-full bg-[#972e26] hover:bg-[#972e26]/90"
                >
                  {isSubmitting ? "Saving..." : isEdit ? "Update Property" : "Create Property"}
                </Button>
              </>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
 
 
