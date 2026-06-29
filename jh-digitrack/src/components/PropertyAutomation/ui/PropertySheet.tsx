import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { XIcon, ChevronDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
 
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
 
import FileAttachment from "./FileAttachment";
import MultiValueInput from "./MultiValueInput";
import { useDocs, useSaveDoc, useUpdateDoc } from "@/hooks/doc";
import { usePropertyDoc, useRenewalList, useUserAccess, useDivisionsByBusiness, usePropertyTypes } from "../hooks/useProperty";
import { PropertyMaster, JHPropertyElectricityConnection, JHPropertyLandline, ChequeDetail, RentalRenewal } from "@/types/JHDigitrack/JHPropertyAutomation";
import { X } from "lucide-react";
import { queryClient } from "@/utils/query-client";
import frappe from "@/utils/frappe-client";
import RenewalTimeline from "./RenewalTimeline";
import { useChequeTypes } from "../hooks/useProperty";
 
type PropertySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string | null;
  mode: "view" | "edit" | "create";
  formatDate: (date?: string) => string;
  renewalColorHighlight: (date?: string) => string;
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

const numericOnlyField = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    const str = String(val).trim();
    if (str === "") return undefined;
    if (/^\d+(\.\d+)?$/.test(str)) return Number(str);
    return str;
  },
  z.number({ invalid_type_error: "Numbers only allowed" }).optional()
);
 
const propertySchema = z.object({
  property_name: z.string().min(1, "Required field"),
  type_of_property: z.string().nullable().optional(),
  other_property_type: z.string().nullable().optional(),
  business_used: z.string().nullable().optional(),
  division_used: z.string().nullable().optional(),
  booked_under: numericOnlyField,
  profit_center: numericOnlyField,
  number_of_units: numericOnlyField,
  number_of_premises: numericOnlyField,
  premise_number: z.string().nullable().optional(),
  staff_allocated: numericOnlyField,
 
  location: z.string().nullable().optional(),
  emirate: z.string().nullable().optional(),
  country: z.string().default("UAE").optional(),
  makani_number: z.string().nullable().optional().refine(
    val => !val || /^\d{10}$/.test(val),
    "Makani number must be exactly 10 digits"
  ),
  po_box_number: z.string().nullable().optional(),
  po_box_renewal_date: z.string().nullable().optional(),
 
  landlord: z.string().nullable().optional(),
  real_estate: z.string().nullable().optional(),
  current_rent: requiredNumberField,
  renewal_date: z.string().min(1, "Required field"),
  landlord_security_deposit: numericOnlyField,
  security_deposit_cheques: z.array(z.object({
    cheque_type: z.string().optional(),
    cheque_amount: z.coerce.number().optional(),
    cheque_date: z.string().optional(),
    payee: z.string().optional(),
  })).optional(),
  tenancy_period: z.string().optional().refine((val) => {
    if (!val) return true;
    const match = val.match(/^(\d+)\s+(Months?|Weeks?|Years?)$/i);
    return !!match && parseInt(match[1], 10) > 0;
  }, {
    message: "Must be number followed by Months, Weeks, or Years (e.g. '12 Months')"
  }),
  lease_start_date: z.string().nullable().optional(),
 
  electricity_accounts: numericOnlyField,
  electricity_connections: z.array(z.object({
    connection_number: z.string().min(1, "Connection Number required"),
    meter_id: z.string().optional(),
    account_number: z.string().optional(),
    connection_type: z.enum(["Electricity", "Water", "Dual"]).optional(),
  })).optional(),
  electricity_connection_numbers: z.string().nullable().optional(),
  electricity_water_security_deposit: numericOnlyField,
  landline_connections: z.array(z.object({
    landline_number: z.string().min(1, "Landline Number required"),
    provider: z.string().optional(),
    line_type: z.enum(["Fixed", "Fax"]).optional(),
  })).optional(),
  landline_accounts: numericOnlyField,
  internet_connection: z.string().regex(/^\d*$/, "Numbers only allowed").nullable().optional(),
 
  cdc_expiry: z.string().optional(),
  hassantuk_expiry: z.string().optional(),
});

type PropertyFormValues = z.infer<typeof propertySchema> & {
  electricity_connections: JHPropertyElectricityConnection[];
  landline_connections: JHPropertyLandline[];
  security_deposit_cheques: ChequeDetail[];
};

  const getEmptyPropertyFormValues = (): PropertyFormValues => ({
  property_name: "",
  type_of_property: "",
  other_property_type: "",
  business_used: "",
  division_used: "",
  booked_under: undefined,
  profit_center: undefined,
  number_of_units: undefined,
  number_of_premises: undefined,
  premise_number: "",
  staff_allocated: undefined,
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
  security_deposit_cheques: [],
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
  const [approvers, setApprovers] = useState<{ order: number; approver: string }[]>([]);
  const [connections, setConnections] = useState<JHPropertyElectricityConnection[]>([]);
  const [landlineConnections, setLandlineConnections] = useState<JHPropertyLandline[]>([]);
  const [securityDepositCheques, setSecurityDepositCheques] = useState<ChequeDetail[]>([]);
  const [landlineErrors, setLandlineErrors] = useState<Record<number, string>>({});
  const lastAutoFilledDivisionRef = useRef<string | null>(null);
  const prevBusinessRef = useRef<string | null | undefined>(undefined);
  const [openApproverIndex, setOpenApproverIndex] = useState<number | null>(null);
  const [approverSearchQuery, setApproverSearchQuery] = useState("");
  const [approverDropdownPos, setApproverDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const approverSearchRef = useRef<HTMLInputElement>(null);
  const { data: roleBasedAccess } = useUserAccess();
  const isLicensingTeam = !!roleBasedAccess?.is_licensing;
 
  const saveDoc = useSaveDoc();
  const updateDoc = useUpdateDoc();

  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isCreate = mode === "create";
  const formId = "property-form";
 
  const { data: propertyData, isFetching: isPropertyFetching } = usePropertyDoc(propertyId);
  console.log(propertyData,"neewwww")
  const { data: renewalsListData, refetch: refetchRenewals } = useRenewalList(
  {
    property: propertyId || undefined,
    limit: 0,
    page: 1,
  },
  !!propertyId
);
const renewalsData = renewalsListData?.renewals ?? [];
  const { data: chequeTypes = [] } = useChequeTypes();
  const { data: propertyTypeOptions = [] } = usePropertyTypes();
 
  const doc = propertyData?.doc as PropertyMaster | undefined;
 
  const hasExistingRenewals = renewalsData.length > 0;
  // const latestRenewal = hasExistingRenewals
  //   ? (renewalsData as RentalRenewal[]).slice().sort(
  //       (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()
  //     )[0]
  //   : null;
  // const isRenewalInProgress =
  //   !!latestRenewal &&
  //   latestRenewal.workflow_state !== "Completed";
 
  const { data: businessData } = useDocs({
    doctype: "JH Business Master",
    limit: 0,
  });
 
  const { data: usersData, isLoading: usersLoading } = useDocs<UserOption>({
    doctype: "User",
    limit: 0,
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
 
  const businessWatch = useWatch({ control, name: "business_used" });
  const typeOfPropertyWatch = useWatch({ control, name: "type_of_property" });
  const { data: divisionData } = useDivisionsByBusiness(businessWatch);

  const divisionWatch = useWatch({
    control,
    name: "division_used",
  });

  const numberOfPremisesWatch = useWatch({ control, name: "number_of_premises" });
  const premiseNumberWatch = useWatch({ control, name: "premise_number" });
  const electricityAccountsWatch = useWatch({ control, name: "electricity_accounts" });
  const landlineAccountsWatch = useWatch({ control, name: "landline_accounts" });
  const { data: selectedDivisionData } = useDocs({
    doctype: "JH Division Master",
    fields: ["name", "division_head", "division_gm"],
    filters: divisionWatch ? [["name", "=", divisionWatch]] : [],
    limit: 1,
  });
 
  const selectedDivision = selectedDivisionData?.[0];

const resetSheetState = useCallback((values: PropertyFormValues = getEmptyPropertyFormValues(), docApprovers?: { order: number; approver: string }[]) => {
    setFiles([]);
    setApprovers(docApprovers ?? []);
    reset(values);
    setConnections(values.electricity_connections || []);
    setLandlineConnections(values.landline_connections || []);
    setSecurityDepositCheques(values.security_deposit_cheques || []);
    setLandlineErrors({});
  }, [reset]);

  const handleSheetOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      lastAutoFilledDivisionRef.current = null;
      prevBusinessRef.current = undefined;
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
      setSecurityDepositCheques(doc.security_deposit_cheques || []);
      const docApprovers = doc.approver
        ? [...doc.approver].sort((a, b) => a.order - b.order)
        : [];
      resetSheetState({
        ...getEmptyPropertyFormValues(),
        ...doc,
        booked_under: doc.booked_under ? Number(doc.booked_under) : undefined,
        profit_center: doc.profit_center ? Number(doc.profit_center) : undefined,
        staff_allocated: doc.staff_allocated ? Number(doc.staff_allocated) : undefined,
        electricity_connections: doc.electricity_connections || [],
        landline_connections: doc.landline_connections || [],
        security_deposit_cheques: doc.security_deposit_cheques || [],
        renewal_date: doc.renewal_date?.split("T")[0],
        lease_start_date: doc.lease_start_date?.split("T")[0],
        po_box_renewal_date: doc.po_box_renewal_date?.split("T")[0],
        cdc_expiry: doc.cdc_expiry?.split("T")[0],
        hassantuk_expiry: doc.hassantuk_expiry?.split("T")[0],
      }, docApprovers);
    }
  }, [open, isCreate, doc, resetSheetState]);
 
  useEffect(() => {
    if (!open || isView) return;
    if (prevBusinessRef.current === undefined) {
      prevBusinessRef.current = businessWatch;
      return;
    }
    if (prevBusinessRef.current !== businessWatch) {
      setValue("division_used", "");
      prevBusinessRef.current = businessWatch;
    }
  }, [businessWatch, open, isView, setValue]);

  // useEffect(() => {
  //   if (!open || !divisionWatch) return;
  //   const div = selectedDivision ?? selectedDivisionData?.[0];
  //   if (!div || lastAutoFilledDivisionRef.current === divisionWatch) return;

  //   // Auto-populate approvers from division head/GM when list is empty.
  //   // Keep this — required default-approver behavior, not dead code.
  //   if (approvers.length === 0) {
  //     const autoApprovers: { order: number; approver: string }[] = [];
  //     if (div.division_head) autoApprovers.push({ order: 1, approver: div.division_head });
  //     if (div.division_gm) autoApprovers.push({ order: autoApprovers.length + 1, approver: div.division_gm });
  //     if (autoApprovers.length > 0) setApprovers(autoApprovers);
  //   }

  //   lastAutoFilledDivisionRef.current = divisionWatch;
  // }, [divisionWatch, open, selectedDivision, selectedDivisionData, approvers.length]);

  const formatDateForAPI = (date?: string) => {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  };
 
  const uploadFile = async (file: File) => {
    const res = await frappe.file.uploadFile(
      file,
      { isPrivate: false, otherData: { is_private: "0" } }
    );
    const fileUrl = (res.data?.message as { file_url?: string })?.file_url;
    if (!fileUrl) throw new Error("File upload failed: no file_url returned");
    console.log("[uploadFile] uploaded as:", fileUrl);
    return fileUrl;
  };
 
  const onSubmit = async (data: PropertyFormValues) => {
    const formData = {
      ...data,
      approver: approvers.map((row, index) => ({
        doctype: "JH Property Approver",
        order: row.order,
        approver: row.approver,
        idx: index + 1,
      })),
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
      security_deposit_cheques: securityDepositCheques.map((cheque, index) => ({
        doctype: "JH Property Cheque Detail",
        ...cheque,
        cheque_amount: Number(cheque.cheque_amount || 0),
        idx: index + 1,
      })),
      landline_accounts: data.landline_accounts !== undefined ? data.landline_accounts : landlineConnections.length,
      electricity_accounts: data.electricity_accounts !== undefined ? data.electricity_accounts : connections.length,
    } as any;

    // const invalidLandlines = landlineConnections.some(
    //   (conn) => conn.landline_number && !/^\d+$/.test(conn.landline_number)
    // );
    // if (invalidLandlines) {
    //   const errors: Record<number, string> = {};
    //   landlineConnections.forEach((conn, i) => {
    //     if (conn.landline_number && !/^\d+$/.test(conn.landline_number)) {
    //       errors[i] = "Numbers only allowed";
    //     }
    //   });
    //   setLandlineErrors(errors);
    //   return;
    // }

    if (isCreate && data.renewal_date && new Date(data.renewal_date) <= new Date()) {
      toast.error("Renewal Date must be a future date");
      return;
    }

    if (data.number_of_premises && data.number_of_premises > 0) {
      const premiseItems = getMultiValueItems(data.premise_number);
      if (premiseItems.length !== data.number_of_premises) {
        toast.warning(
          `Please add exactly ${data.number_of_premises} premise number(s). Currently ${premiseItems.length} added.`
        );
        return;
      }
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

  const isImageFile = (url: string) => /\.(png|jpg|jpeg)$/i.test(url);
 
  const renderField = (
    label: string,
    name: keyof z.infer<typeof propertySchema>,
    value?: string | number,
    type = "text",
    disabled = false
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
            <span>{value !== undefined && value !== null && value !== "" ? value : "-"}</span>
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
                disabled={disabled}
                className={cn(errors[name] ? "border-red-500" : "", disabled ? "bg-muted cursor-not-allowed opacity-60" : "")}
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
 
  const renderApproversTable = () => {
    if (isView) {
      const sorted = [...(doc?.approver ?? [])].sort((a, b) => a.order - b.order);
      return (
        <div className="flex flex-col gap-1 md:col-span-3">
          <div className="flex items-start gap-2 py-1 text-sm">
            <span className="font-medium text-gray-600">Approvers:</span>
            {usersLoading ? (
              <Skeleton className="h-4 w-48" />
            ) : sorted.length === 0 ? (
              <span>-</span>
            ) : (
              <div className="flex flex-col gap-0.5">
                {sorted.map((row) => {
                  const user = usersData?.find((u) => u.name === row.approver);
                  const display = user?.full_name
                    ? `${user.full_name} (${user.email ?? row.approver})`
                    : user?.email || row.approver || "-";
                  const tooltip = display;
                  return (
                    <span key={row.order} title={tooltip}>
                      {row.order}. {display}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1 md:col-span-3">
        <div className="flex justify-between items-center">
          <Label className="text-sm text-gray-600">Approvers</Label>
          <Button
          type="button"
          variant="outline"
          className="w-30 border-2 border-red-300 text-gray-500 border-dashed h-8 text-sm mt-1"
          onClick={() => setApprovers([...approvers, { order: approvers.length + 1, approver: "" }])}
        >
          + Add Approver
        </Button>
        </div>
        
        
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600 w-20">Order</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Approver <span className="text-red-500">*</span></th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {approvers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-gray-400 text-sm">
                    No approvers added
                  </td>
                </tr>
              ) : (
                approvers.map((row, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={1}
                        value={row.order}
                        onChange={(e) => {
                          const updated = [...approvers];
                          updated[index] = { ...updated[index], order: parseInt(e.target.value, 10) || index + 1 };
                          setApprovers(updated);
                        }}
                        className="text-sm h-8 w-16"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="relative">
                        <button
                          type="button"
                          className="w-full border rounded px-2 py-1.5 text-sm text-left flex items-center justify-between gap-1 bg-white hover:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring"
                          onClick={(e) => {
                            if (openApproverIndex === index) {
                              setOpenApproverIndex(null);
                              setApproverSearchQuery("");
                              setApproverDropdownPos(null);
                            } else {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              setApproverDropdownPos({ top: rect.bottom, left: rect.left, width: rect.width });
                              setOpenApproverIndex(index);
                              setApproverSearchQuery("");
                            }
                          }}
                        >
                          <span className={row.approver ? "" : "text-gray-400"}>
                            {row.approver ? (() => {
                              const user = usersData?.find(u => u.name === row.approver);
                              return user?.full_name
                                ? `${user.full_name} (${user.email ?? row.approver})`
                                : user?.email || row.approver;
                            })() : "Search approver..."}
                          </span>
                          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                        </button>

                        {openApproverIndex === index && approverDropdownPos && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => { setOpenApproverIndex(null); setApproverSearchQuery(""); setApproverDropdownPos(null); }}
                            />
                            <div
                              className="fixed z-50 bg-white border rounded-md shadow-lg"
                              style={{ top: approverDropdownPos.top + 4, left: approverDropdownPos.left, width: approverDropdownPos.width }}
                            >
                              <div className="p-2 border-b">
                                <Input
                                  ref={approverSearchRef}
                                  autoFocus
                                  placeholder="Search by name or email..."
                                  value={approverSearchQuery}
                                  onChange={(e) => setApproverSearchQuery(e.target.value)}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="max-h-48 overflow-y-auto">
                                {(() => {
                                  const q = approverSearchQuery.toLowerCase();
                                  const filtered = (usersData ?? []).filter(user =>
                                    !q ||
                                    user.full_name?.toLowerCase().includes(q) ||
                                    user.email?.toLowerCase().includes(q) ||
                                    user.name?.toLowerCase().includes(q)
                                  );
                                  if (filtered.length === 0) {
                                    return <div className="px-3 py-2 text-sm text-gray-400">No users found</div>;
                                  }
                                  return filtered.map(user => (
                                    <button
                                      key={user.name}
                                      type="button"
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex gap-2 items-center"
                                      onClick={() => {
                                        const updated = [...approvers];
                                        updated[index] = { ...updated[index], approver: user.name };
                                        setApprovers(updated);
                                        setOpenApproverIndex(null);
                                        setApproverSearchQuery("");
                                        setApproverDropdownPos(null);
                                      }}
                                    >
                                      <span className="font-medium">{user.full_name || user.email || user.name}</span>
                                      {user.email && user.full_name && (
                                        <span className="text-xs text-gray-400">({user.email})</span>
                                      )}
                                    </button>
                                  ));
                                })()}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 p-0"
                        onClick={() => setApprovers(approvers.filter((_, i) => i !== index))}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
      </div>
    );
  };

  const renderMultiValueField = (
    label: string,
    name: "premise_number" | "electricity_connection_numbers",
    value?: string,
    maxItems?: number
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
                maxItems={maxItems}
                className={errors[name] ? "border-red-500" : ""}
              />
            )}
          />
        )}

        {name === "premise_number" && !isView && Number(numberOfPremisesWatch) > 0 && (() => {
          const currentCount = getMultiValueItems(premiseNumberWatch).length;
          const required = Number(numberOfPremisesWatch);
          const isMatch = currentCount === required;
          return (
            <span className={`text-xs ${isMatch ? "text-green-600" : "text-amber-600"}`}>
              {currentCount} / {required} premise number{required !== 1 ? "s" : ""} added
              {!isMatch && ` — ${required - currentCount > 0 ? `add ${required - currentCount} more` : `remove ${currentCount - required} extra`}`}
            </span>
          );
        })()}

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
      <Label className="text-sm text-gray-600">Landline Connections:</Label>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((conn, index) => (
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
                      <>
                        <Input
                          value={conn.landline_number || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            const newConns = [...landlineConnections];
                            newConns[index].landline_number = val;
                            setLandlineConnections(newConns);
                            setValue("landline_accounts", newConns.length);
                            if (val && !/^\d+$/.test(val)) {
                              setLandlineErrors(prev => ({ ...prev, [index]: "Numbers only allowed" }));
                            } else {
                              setLandlineErrors(prev => {
                                const next = { ...prev };
                                delete next[index];
                                return next;
                              });
                            }
                          }}
                          className={`text-sm ${landlineErrors[index] ? "border-red-500" : ""}`}
                        />
                        {landlineErrors[index] && (
                          <span className="text-red-500 text-xs">{landlineErrors[index]}</span>
                        )}
                      </>
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
                      setLandlineErrors(prev => {
                        const next: Record<number, string> = {};
                        Object.entries(prev).forEach(([k, v]) => {
                          const idx = Number(k);
                          if (idx < index) next[idx] = v;
                          else if (idx > index) next[idx - 1] = v;
                        });
                        return next;
                      });
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          }

          {!isViewMode && (() => {
            const max = Number(landlineAccountsWatch) || 0;
            const atMax = max > 0 && landlineConnections.length >= max;
            return (
              <Button
                type="button"
                variant="outline"
                className="w-full text-gray-500 border-2 border-dashed h-10 text-sm mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  const newConns = [...landlineConnections, { landline_number: "" }];
                  setLandlineConnections(newConns);
                  setValue("landline_accounts", newConns.length);
                }}
              >
                + Add Landline
              </Button>
            );
          })()}
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

  const renderChequeDetails = (
  isViewMode: boolean,
  chequesData?: ChequeDetail[]
) => {
  const data = isViewMode ? (chequesData || []) : securityDepositCheques;

  return (
    <div className="flex flex-col gap-1 md:col-span-4">
      <Label className="text-sm text-gray-600">Security Deposit Cheques:</Label>

      <div className="space-y-2">
        {data.map((cheque, index) => (
          <div key={index} className="flex gap-2 items-end bg-muted p-3 rounded-lg">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className={`${isViewMode ? "flex items-center gap-1" : "flex flex-col gap-1"}`}>
                <Label className="text-xs">Type of Cheque:</Label>
                {isViewMode ? (
                  <span className="text-sm font-medium">{cheque.cheque_type || "-"}</span>
                ) : (
                  <Select
                    value={cheque.cheque_type || ""}
                    onValueChange={(value) => {
                      const newCheques = [...securityDepositCheques];
                      newCheques[index] = { ...newCheques[index], cheque_type: value };
                      setSecurityDepositCheques(newCheques);
                      setValue("security_deposit_cheques", newCheques);
                    }}
                  >
                    <SelectTrigger className="text-sm h-9">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {chequeTypes.map((type) => (
                        <SelectItem key={type} className="cursor-pointer" value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {(["cheque_date", "cheque_amount", "payee"] as const).map((fieldName) => (
                <div key={fieldName} className={`${isViewMode ? "flex items-center gap-1" : "flex flex-col gap-1"}`}>
                  <Label className="text-xs">
                    {fieldName === "cheque_date" ? "Date:" : fieldName === "cheque_amount" ? "Amount:" : "Payee:"}
                  </Label>
                  {isViewMode ? (
                    <span className="text-sm">{fieldName === "cheque_date" ? formatDate(cheque.cheque_date) : cheque[fieldName] || "-"}</span>
                  ) : (
                    <Input
                      type={fieldName === "cheque_amount" ? "number" : fieldName === "cheque_date" ? "date" : "text"}
                      value={cheque[fieldName] || ""}
                      onChange={(e) => {
                        const newCheques = [...securityDepositCheques];
                        newCheques[index] = {
                          ...newCheques[index],
                          [fieldName]: fieldName === "cheque_amount" ? Number(e.target.value || 0) : e.target.value,
                        };
                        setSecurityDepositCheques(newCheques);
                        setValue("security_deposit_cheques", newCheques);
                      }}
                      className="text-sm"
                    />
                  )}
                </div>
              ))}
            </div>

            {!isViewMode && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 -mr-2"
                onClick={() => {
                  const newCheques = securityDepositCheques.filter((_, i) => i !== index);
                  setSecurityDepositCheques(newCheques);
                  setValue("security_deposit_cheques", newCheques);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        {!isViewMode && (
          <Button
            type="button"
            variant="outline"
            className="w-full border-2 text-gray-500 border-dashed h-10 text-sm mt-1"
            onClick={() => {
              const newCheques = [...securityDepositCheques, { cheque_type: "", cheque_amount: 0, cheque_date: "", payee: "" }];
              setSecurityDepositCheques(newCheques);
              setValue("security_deposit_cheques", newCheques);
            }}
          >
            + Add Cheque
          </Button>
        )}
      </div>
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
          {data.map((conn, index) => (
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
          }

              <Button
                type="button"
                variant="outline"
                className="w-full border-2 text-gray-500 border-dashed h-10 text-sm mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  const newConns = [...connections, { connection_number: "" }];
                  setConnections(newConns);
                  setValue("electricity_accounts", newConns.length);
                }}
              >
                + Add Electricity Connection
              </Button>
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

  
 
  const activeRenewal = useMemo(() => {
    if (!renewalsData.length) return null;
    return (renewalsData as RentalRenewal[])
      .filter(r => r.workflow_state !== "Withdrawn")
      .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())[0] ?? null;
  }, [renewalsData]);

  console.log(activeRenewal,"actiiiii")
  const renewalStatusBadge = useMemo(() => {
    if (!activeRenewal || isCreate) return null;
    const state = activeRenewal.workflow_state;

    const stateConfig: Partial<Record<string, { label: string; style: string }>> = {
      "Draft":                  { label: "Draft",                                                          style: "bg-gray-100 text-gray-700" },
      "Pending Approver 1":     { label: `Pending: ${activeRenewal.approver_1_name || "Approver 1"}`,     style: "bg-yellow-100 text-yellow-800" },
      "Pending Approver 2":     { label: `Approved by ${activeRenewal.approver_1_name || "Approver 1"}`,  style: "bg-orange-100 text-orange-800" },
      "Pending Approver 3":     { label: `Approved by ${activeRenewal.approver_2_name || "Approver 2"}`,  style: "bg-orange-100 text-orange-800" },
      "Pending Approver 4":     { label: `Approved by ${activeRenewal.approver_3_name || "Approver 3"}`, style: "bg-orange-100 text-orange-800" },
      "Pending Approver 5":     { label: `Approved by ${activeRenewal.approver_4_name || "Approver 4"}`, style: "bg-orange-100 text-orange-800" },
      "Pending Approver 6":     { label: `Approved by ${activeRenewal.approver_5_name || "Approver 5"}`, style: "bg-orange-100 text-orange-800" },
      "Pending Cheque Details": { label: `Approved by ${activeRenewal.approver_3_name || "Approver 3"}`,   style: "bg-blue-100 text-blue-800" },
      "Pending Admin HOD":      { label: "Added cheque details",                                              style: "bg-blue-100 text-blue-800" },
      "Pending FC":             { label: "Approved Admin HOD",                                                     style: "bg-blue-100 text-blue-800" },
      "Pending CFO":            { label: "Approved by FC",                                                 style: "bg-red-100 text-red-800" },
      "Pending MD":             { label: "Approved by CFO",                                                style: "bg-red-100 text-red-800" },
      "Pending Property PO":    { label: "Approved by MD",                                                 style: "bg-purple-100 text-purple-800" },
      "Pending MIRO":           { label: "PO Created",                                                     style: "bg-indigo-100 text-indigo-800" },
      "Completed":              { label: "Completed",                                                      style: "bg-green-100 text-green-800" },
      "Withdrawn":              { label: "Withdrawn",                                                      style: "bg-gray-100 text-gray-500" },
    };

    const config = stateConfig[state ?? ""] ?? { label: state ?? "Unknown", style: "bg-gray-100 text-gray-500" };

    return (
      <span className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${config.style}`}>
        {config.label}
      </span>
    );
  }, [activeRenewal, isCreate]);

  const emirateOptions = [
    "Abu Dhabi",
    "Dubai",
    "Sharjah",
    "Ajman",
    "Umm Al Quwain",
    "Ras Al Khaimah",
    "Fujairah",
  ];
 
  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="sm:max-w-5xl px-5 pb-30">
        <SheetHeader className="flex-row text-2xl justify-between items-center px-0 py-2">
          <div className="flex items-center gap-5">
            <SheetTitle>
              {isCreate ? "Create Property" : isEdit ? "Edit Property" : "Property Details"}
            </SheetTitle>
          </div>

          <div className="">
            {renewalStatusBadge}
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
                    <span>
                      {doc?.type_of_property === "Other"
                        ? doc?.other_property_type || "Other"
                        : doc?.type_of_property || "-"}
                    </span>
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

              {typeOfPropertyWatch === "Other" && !isView && (
                <div className="flex flex-col gap-1">
                  <Label className="text-sm text-gray-600">Specify Type</Label>
                  <Controller
                    name="other_property_type"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Please specify property type"
                      />
                    )}
                  />
                </div>
              )}
 
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
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger className="text-sm h-9">
                          <SelectValue placeholder="Select Business" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {[...(businessData ?? [])].sort((a: NamedOption, b: NamedOption) => a.name.localeCompare(b.name)).map((business: NamedOption) => (
                            <SelectItem key={business.name} value={business.name}>
                              {business.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger className="text-sm h-9">
                          <SelectValue placeholder="Select Division" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {[...(divisionData ?? [])].sort((a, b) => a.name.localeCompare(b.name)).map((div) => (
                            <SelectItem key={div.name} value={div.name}>
                              {div.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </div>

              {renderField("Booked Under", "booked_under", doc?.booked_under)}
              {renderField("Profit Center", "profit_center", doc?.profit_center)}
              {renderField("Number of Units", "number_of_units", doc?.number_of_units)}
              {renderField("Number of Premises", "number_of_premises", doc?.number_of_premises)}
              {renderMultiValueField("Premise Number", "premise_number", doc?.premise_number, Number(numberOfPremisesWatch) || undefined)}
              {renderField("Staff Allocated", "staff_allocated", doc?.staff_allocated)}
              {renderApproversTable()}
            </div>
 
            <Separator />
 
            <h2 className="text-lg font-semibold">Location</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {renderField("Location", "location", doc?.location)}
              <div className="flex flex-col gap-1">
                {!isView && <Label className="text-sm text-gray-600">Emirate</Label>}
                {isView ? (
                  <div className="flex items-center gap-2 py-1 text-sm">
                    <span className="font-medium text-gray-600">Emirate:</span>
                    <span>{doc?.emirate || "-"}</span>
                  </div>
                ) : (
                  <Controller
                    name="emirate"
                    control={control}
                    render={({ field }) => (
                      <select {...field} value={field.value ?? ""} className="border rounded px-2 py-2 text-sm">
                        <option value="">Select Emirate</option>
                        {emirateOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                  />
                )}
              </div>
              {renderField("Country", "country", doc?.country)}
              {renderField("Makani Number", "makani_number", doc?.makani_number, "text", (val) => val.replace(/\s/g, ""))}
              {renderField("PO Box", "po_box_number", doc?.po_box_number)}
              {renderField("PO Box Renewal", "po_box_renewal_date", formatDate(doc?.po_box_renewal_date), "date")}
            </div>
 
            <Separator />
 
            <h2 className="text-lg font-semibold">Landlord</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {renderField("Landlord", "landlord", doc?.landlord)}
              {renderField("Real Estate", "real_estate", doc?.real_estate)}
               {isView ? (
                <div className="flex items-center gap-2 py-1 text-sm">
                  <span className="font-medium text-gray-600">Lease start date:</span>
                  <span>{formatDate(doc?.lease_start_date)}</span>
                </div>
              ) : (
                renderField("Lease start date", "lease_start_date", doc?.lease_start_date, "date")
              )}

               {renderTenancyPeriodField("Tenancy Period", "tenancy_period", doc?.tenancy_period)}
 
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

               {renderField("Current Rent", "current_rent", doc?.current_rent)}
            </div>

            <Separator />

            <h2 className="text-lg font-semibold">Security Deposit</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {renderField(
                "Deposit Amount",
                "landlord_security_deposit",
                doc?.landlord_security_deposit
              )}
              {renderChequeDetails(isView, doc?.security_deposit_cheques)}
            </div>
 
            <Separator />
 
            <h2 className="text-lg font-semibold">Utilities</h2>
            <div className={`grid grid-cols-1 ${isView ? "md:grid-cols-3" : "md:grid-cols-4"} gap-3`}>
              {renderField("Electricity Accounts", "electricity_accounts", doc?.electricity_accounts, "text", true)}
              {renderField(
                "Electricity / Water Security Deposit",
                "electricity_water_security_deposit",
                doc?.electricity_water_security_deposit
              )}
              {renderField("Landline Accounts", "landline_accounts", doc?.landline_accounts, "text", true)}
              {renderField("Internet Connection", "internet_connection", doc?.internet_connection)}
            </div>
            {renderLandlineConnections(isView, doc?.landline_connections)}
            {renderElectricityConnections(isView, doc?.electricity_connections)}
 
 
            <h2 className="text-lg font-semibold">Compliance</h2>
            <div className="grid grid-cols-1 w-110 md:grid-cols-2 gap-4">
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
                        {...(isImageFile(file.attachment)
                          ? { download: getFileName(file.attachment) }
                          : { target: "_blank", rel: "noopener noreferrer" })}
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
                          {...(isImageFile(file.attachment)
                            ? { download: getFileName(file.attachment) }
                            : { target: "_blank", rel: "noopener noreferrer" })}
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
                <Separator />
                {/* <h2 className="text-lg font-semibold">Renewal History</h2> */}
                
                  <div className="pb-20">
                    {(renewalsData as RentalRenewal[])
                      .slice()
                      .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
                      .map((renewal, index) => (
                        <RenewalTimeline
                          key={renewal.name}
                          renewalId={renewal.name}
                          defaultOpen={index === 0}
                          title={`Renewal History`}
                        />
                      ))
                    }
                  </div>
              
              </>
            )}
          </form>
        </ScrollArea>
 
        <SheetFooter className="absolute bottom-0 w-full bg-white px-5">

           {!isView && (
          <div className="flex w-full gap-2">
           
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
            
          </div>
        )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
 
 