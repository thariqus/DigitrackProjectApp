import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type DelegationRecord = {
  name: string;
};

type UserOption = {
  name: string;
  full_name?: string;
  email?: string;
};

type DelegationFormValues = {
  delegate: string;
  delegation_type: "Temporary" | "Permanent";
  from_date: string;
  to_date: string;
};

const delegationFormSchema = z
  .object({
    delegate: z.string().min(1, "Please select a user"),
    delegation_type: z.enum(["Temporary", "Permanent"]),
    from_date: z.string().optional(),
    to_date: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.delegation_type !== "Temporary") {
      return;
    }

    if (!values.from_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["from_date"],
        message: "From date is required for temporary delegation",
      });
    }

    if (!values.to_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to_date"],
        message: "To date is required for temporary delegation",
      });
    }

    if (values.from_date && values.to_date && values.to_date < values.from_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to_date"],
        message: "To date must be on or after from date",
      });
    }
  });

const defaultFormValues: DelegationFormValues = {
  delegate: "",
  delegation_type: "Temporary",
  from_date: "",
  to_date: "",
};

type CreateDelegationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usersData: UserOption[];
  currentUserId: string | undefined;
  isUsersLoading: boolean;
  onCreate: (values: DelegationFormValues) => void;
};

export function CreateDelegationDialog({
  open,
  onOpenChange,
  usersData,
  currentUserId,
  isUsersLoading,
  onCreate,
}: CreateDelegationDialogProps) {
  const [delegateSearch, setDelegateSearch] = useState("");
  const [openDelegateField, setOpenDelegateField] = useState(false);
  const delegateFieldRef = useRef<HTMLDivElement | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    reset,
  } = useForm<DelegationFormValues>({
    resolver: zodResolver(delegationFormSchema),
    defaultValues: defaultFormValues,
  });

  const delegationType = useWatch({
    control,
    name: "delegation_type",
  });

  const userOptions = useMemo(
    () =>
      usersData
        .filter((user) => user.name && user.name !== currentUserId)
        .map((user) => ({
          value: user.name,
          label: user.full_name
            ? `${user.email || user.name} (${user.full_name})`
            : user.email || user.name,
        }))
        .filter((user) => user.label.toLowerCase().includes(delegateSearch.toLowerCase())),
    [usersData, currentUserId, delegateSearch]
  );

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!openDelegateField) return;

      if (delegateFieldRef.current && !delegateFieldRef.current.contains(event.target as Node)) {
        setOpenDelegateField(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openDelegateField]);

  useEffect(() => {
    if (delegationType === "Permanent") {
      setValue("from_date", "", { shouldValidate: false });
      setValue("to_date", "", { shouldValidate: false });
    }
  }, [delegationType, setValue]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setDelegateSearch("");
      setOpenDelegateField(false);
      reset(defaultFormValues);
    }
  };

  const onSubmit = (values: DelegationFormValues) => {
    onCreate(values);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Delegation</DialogTitle>
          <DialogDescription>
            Select a user, choose the delegation type, and set a date range for temporary delegations.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="delegate">Select User</Label>
            <Controller
              name="delegate"
              control={control}
              render={({ field }) => {
                const selectedUser = usersData.find((u) => u.name === field.value);

                const displayValue =
                  selectedUser?.email
                    ? `${selectedUser.email}${selectedUser.full_name ? ` (${selectedUser.full_name})` : ""}`
                    : field.value || "";

                return (
                  <div ref={delegateFieldRef} className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={openDelegateField}
                      disabled={isUsersLoading}
                      className={cn(
                        "w-full justify-between",
                        "text-sm",
                        errors.delegate ? "border-destructive focus:border-destructive" : ""
                      )}
                      onClick={() => {
                        const nextOpen = !openDelegateField;
                        setOpenDelegateField(nextOpen);
                        if (!nextOpen) setDelegateSearch("");
                      }}
                    >
                      {displayValue || "Select user..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>

                    {openDelegateField && (
                      <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                        <div className="border-b p-2">
                          <Input
                            value={delegateSearch}
                            onChange={(e) => setDelegateSearch(e.target.value)}
                            placeholder="Search user..."
                            className="h-9"
                            autoFocus
                          />
                        </div>

                        <div className="max-h-[280px] overflow-y-auto p-1">
                          {isUsersLoading ? (
                            <div className="px-2 py-3 text-sm text-muted-foreground">Loading users...</div>
                          ) : userOptions.length === 0 ? (
                            <div className="px-2 py-3 text-sm text-muted-foreground">No users found.</div>
                          ) : (
                            userOptions.map((option) => {
                              const isSelected = field.value === option.value;

                              return (
                                <Button
                                  key={option.value}
                                  type="button"
                                  variant="ghost"
                                  className={cn(
                                    "flex w-full items-center gap-2 justify-start px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                                    isSelected && "bg-accent text-accent-foreground"
                                  )}
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation(); 
                                    field.onChange(option.value);
                                    setDelegateSearch("");
                                    setOpenDelegateField(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "h-4 w-4",
                                      isSelected ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span className="truncate">{option.label}</span>
                                </Button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }}
            />
            {errors.delegate && (
              <p className="text-sm text-destructive">{errors.delegate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="delegation_type">Type</Label>
            <Controller
              name="delegation_type"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="delegation_type">
                    <SelectValue placeholder="Select delegation type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Temporary">Temporary</SelectItem>
                    <SelectItem value="Permanent">Permanent</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {delegationType === "Temporary" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="from_date">From Date</Label>
                <Controller
                  name="from_date"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="from_date"
                      type="date"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  )}
                />
                {errors.from_date && (
                  <p className="text-sm text-destructive">{errors.from_date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="to_date">To Date</Label>
                <Controller
                  name="to_date"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="to_date"
                      type="date"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  )}
                />
                {errors.to_date && (
                  <p className="text-sm text-destructive">{errors.to_date.message}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Create Delegation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

