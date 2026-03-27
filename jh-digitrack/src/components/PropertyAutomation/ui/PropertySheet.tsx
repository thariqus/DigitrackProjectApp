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

// ======
// ZOD SCHEMA
// ======
const propertySchema = z.object({
  property_name: z.string().min(1, "Required"),
  type_of_property: z.string(),
  division_used: z.string(),
  booked_under: z.string(),
  profit_center: z.string(),
  number_of_units: z.string(),
  number_of_premises: z.string(),
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
  current_rent: z.string(),
  renewal_date: z.string(),
  landlord_security_deposit: z.string(),
  tenancy_period: z.string(),

  electricity_accounts: z.string(),
  electricity_connection_no: z.string(),
  electricity_security_desposit: z.string(),
  water_security_deposit: z.string(),
  landline_numbers: z.string(),
  internet_connection: z.string(),

  CDC_exp: z.string(),
  hassantuk_exp: z.string(),
});

export default function PropertySheet({ open, onOpenChange }) {

  const { register, handleSubmit } = useForm({
    resolver: zodResolver(propertySchema),
  });

  const onSubmit = (data) => {
    console.log(data);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-5xl px-5 pb-30">

        {/* Header */}
        <SheetHeader className="flex-row justify-between items-center px-0 py-2">
          <SheetTitle className="text-2xl font-semibold">
            Create Property
          </SheetTitle>

          {/* Renewal card */}
          <div className={`p-2 rounded-lg border bg-yellow-200 text-yellow-300`}>
            <p>Renewal Date : 25/06/2026</p>
            <p>Status : Pending</p>
          </div>

          <Button variant="ghost" size="icon">
            <XIcon className="size-4" />
          </Button>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] pr-3">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">

            {/*  IDENTITY */}
            <h2 className="text-lg font-semibold">Identity</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input placeholder="Enter Property Name" {...register("property_name")} />
              <Input placeholder="Enter Type" {...register("type_of_property")} />
              <Input placeholder="Enter Division Used" {...register("division_used")} />
              <Input placeholder="Enter Booked Under" {...register("booked_under")} />
              <Input placeholder="Enter Profit Center" {...register("profit_center")} />
              <Input placeholder="Enter No. of Units" {...register("number_of_units")} />
              <Input placeholder="Enter No. of Premises" {...register("number_of_premises")} />
              <Input placeholder="Enter Premise No" {...register("premise_no")} />
              <Input placeholder="Enter Staff Allocated" {...register("staff_allocated")} />
            </div>

            <Separator />

            {/*  LOCATION  */}
            <h2 className="text-lg font-semibold">Location</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input placeholder="Enter Location" {...register("location")} />
              <Input placeholder="Enter Emirate" {...register("emirate")} />
              <Input placeholder="Enter Country" {...register("country")} />
              <Input placeholder="Enter Makani Number" {...register("makani_number")} />
              <Input placeholder="Enter PO Box Number" {...register("po_box_number")} />
              <Input type="date" {...register("po_box_renewal_date")} />
            </div>

            <Separator />

            {/*  LANDLORD  */}
            <h2 className="text-lg font-semibold">Landlord</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input placeholder="Enter Landlord" {...register("landlord")} />
              <Input placeholder="Enter Real Estate" {...register("real_estate")} />
              <Input placeholder="Enter Current Rent" {...register("current_rent")} />
              <Input type="date" {...register("renewal_date")} />
              <Input placeholder="Enter Security Deposit" {...register("landlord_security_deposit")} />
              <Input placeholder="Enter Tenancy Period" {...register("tenancy_period")} />
            </div>

            <Separator />

            {/*  UTILITIES  */}
            <h2 className="text-lg font-semibold">Utilities</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input placeholder="Enter Electricity Accounts" {...register("electricity_accounts")} />
              <Input placeholder="Enter Connection No" {...register("electricity_connection_no")} />
              <Input placeholder="Enter Electricity Deposit" {...register("electricity_security_desposit")} />
              <Input placeholder="Enter Water Deposit" {...register("water_security_deposit")} />
              <Input placeholder="Enter Landline Numbers" {...register("landline_numbers")} />
              <Input placeholder="Enter Internet Connection" {...register("internet_connection")} />
            </div>

            <Separator />

            {/*  COMPLIANCE  */}
            <h2 className="text-lg font-semibold">Compliance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input type="date" {...register("CDC_exp")} />
              <Input type="date" {...register("hassantuk_exp")} />
            </div>

            <Separator />

            {/*  DOCUMENTS  */}
            <h2 className="text-lg font-semibold">Documents</h2>
            <FileAttachment/>

            <Separator/>
            
            <div className="mb-30">
              <h3 className="font-semibold">Renewal History</h3>
              {/* show renewal list */}
            </div>

          </form>
        </ScrollArea>

        



        {/* Footer */}
        <SheetFooter className="absolute bottom-0 w-full bg-white px-5">
          
          <div className="flex w-full gap-2">
            <Button variant="outline" className="w-full">
              Cancel
            </Button>
            <Button className="w-full bg-[#972e26] hover:bg-[#972e26]/90">
              Save Property
            </Button>
          </div>
        </SheetFooter>

      </SheetContent>
    </Sheet>
  );
}