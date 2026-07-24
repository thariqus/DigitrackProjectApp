import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
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
import { cn } from "@/lib/utils";

type UserOption = {
  name: string;
  full_name?: string;
  email?: string;
};

const delegationSchema = z.object({
  delegate: z.string().min(1, "Please select a user"),
  comment: z.string().min(1, "Comment is required"),
});

type DelegationFormValues = z.infer<typeof delegationSchema>;

type RenewalDelegationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usersData: UserOption[];
  currentUserId: string | undefined;
  isUsersLoading: boolean;
  onDelegate: (values: DelegationFormValues) => void;
  isSubmitting?: boolean;
};

export function RenewalDelegationModal({
  open,
  onOpenChange,
  usersData,
  currentUserId,
  isUsersLoading,
  onDelegate,
  isSubmitting = false,
}: RenewalDelegationModalProps) {
  const [delegateSearch, setDelegateSearch] = useState("");
  const [openDelegateField, setOpenDelegateField] = useState(false);
  const delegateFieldRef = useRef<HTMLDivElement | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<DelegationFormValues>({
    resolver: zodResolver(delegationSchema),
    defaultValues: { delegate: "", comment: "" },
    mode: "onChange",
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

// Handle outside click to close delegate dropdown
  useEffect(() => {
    if (!openDelegateField) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (delegateFieldRef.current && !delegateFieldRef.current.contains(event.target as Node)) {
        setOpenDelegateField(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [openDelegateField]);

  useEffect(() => {
    if (!open) {
      reset({ delegate: "", comment: "" });
      setDelegateSearch("");
      setOpenDelegateField(false);
    }
  }, [open, reset]);

  const handleClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      reset({ delegate: "", comment: "" });
      setDelegateSearch("");
      setOpenDelegateField(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Delegate Approval</DialogTitle>
          <DialogDescription>
            Select a user to delegate this approval to. A comment is required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onDelegate)} className="space-y-4">
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
                        "w-full justify-between text-sm",
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

          <div className="space-y-2 overflow-x-hidden">
            <Label htmlFor="comment">Comment</Label>
            <Controller
              name="comment"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  rows={6}
                  className={cn(
                    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    errors.comment ? "border-destructive focus-visible:ring-destructive" : ""
                  )}
                  placeholder="Enter reason for delegation..."
                />
              )}
            />
            {errors.comment && (
              <p className="text-sm text-destructive">{errors.comment.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isValid}>
              {isSubmitting ? "Delegating..." : "Delegate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

