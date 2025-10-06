import { useCallback, useEffect } from "react";
import { format } from "date-fns";
import { useForm, Controller } from "react-hook-form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useCreateScrapItem, useUpdateScrapItem,  } from "@/hooks/scrapitem";

interface ScrapItemFormData {
  name?: string; 
  title: string;
  date: string;
  quantity: number;
  employee_id: string;
  employee_name: string;
  location: string;
  status: string;
  description: string;
  contact_details: string;
  image1?: string | null;
  image2?: string | null;
  image3?: string | null;
  modified_date?: string;

}

interface ScrapItemSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refetch?: () => Promise<unknown>;
  initialData?: ScrapItemFormData; 
}

export function ScrapItemSheet({
  open,
  onOpenChange,
  refetch,
  initialData,
}: ScrapItemSheetProps) {
  const defaultValues: ScrapItemFormData = {
    title: "",
    date: format(new Date(), "dd-MM-yyyy"),
    quantity: 0,
    employee_id: "",
    employee_name: "",
    location: "",
    status: "Available",
    description: "",
    contact_details: "",
    modified_date: "",
  };

  const { control, handleSubmit, reset, formState: { errors } } = useForm<ScrapItemFormData>({
    defaultValues: initialData || defaultValues,
  });


  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
        date: initialData.date ? format(new Date(initialData.date), "dd-MM-yyyy") : "",
        modified_date: format(new Date(), "dd-MM-yyyy"), 
      });
    } else {
      reset(defaultValues);
    }
  }, [initialData, reset]);

  const { mutateAsync: createScrapItem } = useCreateScrapItem();

  const { mutateAsync: updateScrapItem } = useUpdateScrapItem();

  const onSubmit = useCallback(
    async (data: ScrapItemFormData) => {
      try {
        if (initialData?.name) {
          await updateScrapItem({ ...data, name: initialData.name });
          toast.success("Idle Asset updated successfully");
        } else {
          await createScrapItem(data);
          toast.success("Idle Asset created successfully");
        }

        reset(defaultValues);
        onOpenChange(false);
        await refetch?.();
      } catch (error: any) {
        console.error(error);
        toast.error(error.message || "Failed to submit Idle Asset");
      }
    },
    [initialData, createScrapItem, updateScrapItem, onOpenChange, refetch, reset]
  );

return (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent className="sm:max-w-3xl px-5 flex flex-col">
      <SheetHeader className="px-0 flex-row justify-between items-center">
        <SheetTitle className="text-2xl font-bold">
          {initialData ? "Edit Idle Asset" : "Create Idle Asset"}
        </SheetTitle>
        <SheetClose asChild>
          <Button variant="ghost" size="icon" aria-label="Close">X</Button>
        </SheetClose>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto pr-2">
        <form id="scrapitem-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="after:content-['*'] after:text-[#972e26] after:ml-0.5">
              Item Name
            </Label>
            <Controller
              name="title"
              control={control}
              rules={{ required: "Item Name is required" }}
              render={({ field }) => <Input id="title" placeholder="Enter Item Name" {...field} />}
            />
            {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Controller name="date" control={control} render={({ field }) => (
                <Input type="text" id="date" value={field.value} readOnly />
              )} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity" className="after:content-['*'] after:text-[#972e26] after:ml-0.5">
                Quantity
              </Label>
              <Controller
                name="quantity"
                control={control}
                rules={{
                  required: "Quantity is required",
                  min: { value: 1, message: "Quantity must be at least 1" },
                }}
                render={({ field }) => <Input type="number" id="quantity" placeholder="Enter Quantity" {...field} />}
              />
              {errors.quantity && <p className="text-red-500 text-sm">{errors.quantity.message}</p>}
            </div>
          </div>

            {initialData && (
              <div className="space-y-2">
                <Label htmlFor="modified_date">Modified Date</Label>
                <Controller
                  name="modified_date"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="text"
                      id="modified_date"
                      value={field.value}
                      readOnly
                    />
                  )}
                />
              </div>
            )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location" className="after:content-['*'] after:text-[#972e26] after:ml-0.5">
                Location
              </Label>
              <Controller
                name="location"
                control={control}
                rules={{ required: "Location is required" }}
                render={({ field }) => (
                  <Input id="location" placeholder="Enter Location" {...field} />
                )}
              />
              {errors.location && <p className="text-red-500 text-sm">{errors.location.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Controller name="status" control={control} render={({ field }) => (
                <select id="status" className="w-full border rounded-md px-3 py-2 text-sm" {...field}>
                  <option value="" disabled>Select Status</option>
                  <option value="Available">Available</option>
                  <option value="Sold">Sold</option>
                  <option value="Inactive">Inactive</option>
                </select>
              )} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_details">Contact Details</Label>
            <Controller name="contact_details" control={control} render={({ field }) => (
              <Input id="contact_details" placeholder="Enter Contact Details" {...field} />
            )} />
          </div>
<div className="grid grid-cols-3 gap-4">
  <div className="space-y-2">
    <Label htmlFor="image1">Image 1</Label>
    <Controller
      name="image1"
      control={control}
      render={({ field }) => (
        <div className="flex flex-col gap-2">
          {field.value ? (
            <div className="relative">
              <img
                src={field.value}
                alt="Image 1 Preview"
                className="h-24 w-24 object-cover rounded-md border"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 bg-white/80"
                onClick={() => field.onChange("")}
              >
                ✕
              </Button>
            </div>
          ) : (
            <Input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const formData = new FormData();
                formData.append("file", file, file.name);
                formData.append("is_private", "0");
                formData.append("optimize", "1");

                const res = await fetch("/api/method/upload_file", {
                  method: "POST",
                  body: formData,
                });

                const data = await res.json();
                if (data.message?.file_url) {
                  field.onChange(data.message.file_url);
                }
              }}
            />
          )}
        </div>
      )}
    />
  </div>

  <div className="space-y-2">
    <Label htmlFor="image2">Image 2</Label>
    <Controller
      name="image2"
      control={control}
      render={({ field }) => (
        <div className="flex flex-col gap-2">
          {field.value ? (
            <div className="relative">
              <img
                src={field.value}
                alt="Image 2 Preview"
                className="h-24 w-24 object-cover rounded-md border"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 bg-white/80"
                onClick={() => field.onChange("")}
              >
                ✕
              </Button>
            </div>
          ) : (
            <Input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const formData = new FormData();
                formData.append("file", file, file.name);
                formData.append("is_private", "0");

                const res = await fetch("/api/method/upload_file", {
                  method: "POST",
                  body: formData,
                });

                const data = await res.json();
                if (data.message?.file_url) {
                  field.onChange(data.message.file_url);
                }
              }}
            />
          )}
        </div>
      )}
    />
  </div>

  <div className="space-y-2">
    <Label htmlFor="image3">Image 3</Label>
    <Controller
      name="image3"
      control={control}
      render={({ field }) => (
        <div className="flex flex-col gap-2">
          {field.value ? (
            <div className="relative">
              <img
                src={field.value}
                alt="Image 3 Preview"
                className="h-24 w-24 object-cover rounded-md border"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 bg-white/80"
                onClick={() => field.onChange("")}
              >
                ✕
              </Button>
            </div>
          ) : (
            <Input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const formData = new FormData();
                formData.append("file", file, file.name);
                formData.append("is_private", "0");

                const res = await fetch("/api/method/upload_file", {
                  method: "POST",
                  body: formData,
                });

                const data = await res.json();
                if (data.message?.file_url) {
                  field.onChange(data.message.file_url);
                }
              }}
            />
          )}
        </div>
      )}
    />
  </div>
</div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Controller name="description" control={control} render={({ field }) => (
              <Textarea id="description" placeholder="Enter Item Details" {...field} />
            )} />
          </div>
        </form>
      </div>

      <SheetFooter className="flex-shrink-0 border-t pt-4 mt-4">
        <div className="flex gap-2 w-full">
          <SheetClose asChild>
            <Button variant="outline" className="w-full" onClick={() => reset(defaultValues)}>
              Cancel
            </Button>
          </SheetClose>
          <Button type="submit" form="scrapitem-form" className="w-full bg-[#972e26] hover:bg-[#972e26]/90 text-white">
            {initialData ? "Update Idle Asset" : "Create Idle Asset"}
          </Button>
        </div>
      </SheetFooter>
    </SheetContent>
  </Sheet>
);
}

