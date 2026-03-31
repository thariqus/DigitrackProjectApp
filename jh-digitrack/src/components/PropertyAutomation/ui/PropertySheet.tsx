import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { XIcon } from "lucide-react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import FileAttachment from "./FileAttachment";
import { useDocDetail, useDocs } from "@/hooks/doc";
import { useEffect } from "react";
import { PropertyMaster } from "@/types/JHDigitrack/JHPropertyAutomation";

type PropertySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string | null;
  mode: "view" | "edit" | "create";
  formatDate: (date?: string) => string;
  renewalColorHighlight: (date?: string) => string;
};

// ZOD SCHEMA

const propertySchema = z.object({
  property_name: z.string().min(1, "Required"),
  type_of_property: z.string(),
  division_used: z.string(),
  booked_under: z.string(),
  profit_center: z.string(),
  number_of_units: z.coerce.number().optional(),
  number_of_premises: z.coerce.number().optional(),
  premise_no: z.string(),
  staff_allocated: z.string(),

  location: z.string(),
  emirate: z.string(),
  country: z.string(),
  makani_number: z.string(),
  po_box_number: z.string(),
  po_box_renewal_date: z.string(),

  landlord: z.string(),
  real_estate: z.string(),
  current_rent: z.coerce.number().optional(),
  renewal_date: z.string(),
  landlord_security_deposit: z.coerce.number().optional(),
  tenancy_period: z.string(),

  electricity_accounts: z.coerce.number().optional(),
  electricity_connection_no: z.string(),
  electricity_water_security_deposit: z.coerce.number().optional(),
  landline_numbers: z.string(),
  internet_connection: z.string(),

  cdc_expiry: z.string().optional(),
  hassantuk_expiry: z.string().optional(),
});

export default function PropertySheet({ open, onOpenChange, propertyId , mode, formatDate, renewalColorHighlight}: PropertySheetProps) {

  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isCreate = mode === "create";

  const { data: propertyData,isLoading,refetch,} = useDocDetail<PropertyMaster>({
    doctype: "JH Property Master",
    name: propertyId || "",
    disabled: !propertyId,
  });

  const doc = propertyData?.docs?.[0];
  console.log(doc, "data");
  console.log(propertyId, "id");

  const { register, handleSubmit, reset } = useForm({
    resolver: zodResolver(propertySchema),
  });

  useEffect(() => {
    if (isCreate) {
      reset({});
    }
  }, [isCreate, reset]);

useEffect(() => {
  if (doc) {
    reset({
      ...doc,
      premise_no: doc.premise_number,
      electricity_connection_no: doc.electricity_connection_numbers,
      electricity_water_security_deposit: doc.electricity_water_security_deposit,
      cdc_expiry: doc.cdc_expiry,
      hassantuk_expiry: doc.hassantuk_expiry,
    });
  }
}, [doc, reset]);


  // const onSubmit = (data) => {
  //   console.log(data);
  // };

  const renderField = (
    label: string,
    name: keyof z.infer<typeof propertySchema>,
    value?: string | number,
    type = "text"
  ) => {
    return (
      <div className="flex flex-col gap-1">
        {!isView && (
          <Label className="text-sm text-gray-600">{label}</Label>
        )}

        {isView ? (
          <div className="flex items-center gap-2 py-1 rounded  text-sm">
            <span className="font-medium text-gray-600 ">
              {label}:
            </span>
            <span>{value || "-"}</span>
          </div>
        ) : (
          <Input
            type={type}
            defaultValue={value || ""}
            {...register(name)}
          />
        )}
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
          </SheetTitle>

          {/* Renewal card */}
          {/* <div className={`p-2 rounded-lg border bg-yellow-200 text-yellow-300`}>
            <p>Renewal Date : 25/06/2026</p>
            <p>Status : Pending</p>
          </div> */}

          <Button variant="ghost" size="icon"  onClick={() => onOpenChange(false)}>
            <XIcon className="size-4" />
          </Button>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] pr-3">
          <form
            // onSubmit={handleSubmit(onSubmit)} 
            className="space-y-6 mt-4">

            {/*  IDENTITY */}
            <h2 className="text-lg font-semibold">Identity</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {renderField("Property Name", "property_name", doc?.property_name)}
            {renderField("Property Type", "type_of_property", doc?.type_of_property)}
            {renderField("Division Used", "division_used", doc?.division_used)}
            {renderField("Booked Under", "booked_under", doc?.booked_under)}
            {renderField("Profit Center", "profit_center", doc?.profit_center)}
            {renderField("No. of Units", "number_of_units", doc?.number_of_units)}
            {renderField("No. of Premises", "number_of_premises", doc?.number_of_premises)}
            {renderField("Premise No", "premise_no", doc?.premise_number)}
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
            </div>

            <Separator />

            {/*  UTILITIES  */}
            <h2 className="text-lg font-semibold">Utilities</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {renderField("Electricity Accounts", "electricity_accounts", doc?.electricity_accounts)}
              
              {renderField(
                "Connection No",
                "electricity_connection_no",
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
                  <span className={doc?.cdc_expiry}>
                    {formatDate(doc?.cdc_expiry)}
                  </span>
                </div>
                ) : (
                  renderField("CDC Expiry", "cdc_expiry", doc?.cdc_expiry, "date")
                )}
                {isView ? (
                <div className="flex items-center gap-2 py-1 text-sm">
                  <span className="font-medium text-gray-600">Hassantuk Expiry:</span>
                  <span className={doc?.hassantuk_expiry}>
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
                {doc?.documents && doc.documents.length > 0 ? (
                  doc.documents.map((file: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 rounded px-3"
                    >
                      <span className="text-sm text-gray-700">
                        {file.attachment || `Document ${index + 1}`}
                      </span>

                      <a
                        href={file.attachment}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 text-sm underline cursor-pointer"
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
              <FileAttachment />
            )}

            <Separator/>
            
            {/* <div className="mb-30">
              <h3 className="font-semibold">Renewal History</h3>
            </div> */}

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
                  className="w-full bg-[#972e26] hover:bg-[#972e26]/90"
                >
                  {isEdit ? "Update Property" : "Create Property"}
                </Button>
              </>
            }

          </div>
        </SheetFooter>

      </SheetContent>
    </Sheet>
  );
}