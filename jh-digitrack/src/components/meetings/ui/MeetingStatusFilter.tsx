import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useDocTypeMeta } from "@/hooks/doc";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MeetingStatusFilterProps {
  handleStatusChange: () => void;
  clearFilters: () => void;
  statusValues: string[];
  setStatusValues: (value: string[] | ((prev: string[]) => string[])) => void;
}

export function MeetingStatusFilter(props: MeetingStatusFilterProps) {
  const [openStatus, setOpenStatus] = useState(false);

  const { data: meetingMetadata, isLoading: isMeetingMetadataLoading } =
    useDocTypeMeta("JH Grouped Task Master");
  const statusOptions = meetingMetadata?.fields
    .find((field: { fieldname: string }) => field.fieldname === "status")
    .options.split("\n")
    .map((option: string) => ({
      value: option,
      label: option,
    })) as { value: string; label: string }[];
  if (isMeetingMetadataLoading) return <Skeleton className="w-[180px] h-10" />;

  const hasActiveFilters = props.statusValues.length > 0;
  return (
    <div className="flex items-center gap-2">
      <Popover open={openStatus} onOpenChange={setOpenStatus}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-9 border-dashed border-[#E2E8F0] bg-transparent hover:bg-transparent hover:text-[#64748B]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Status
            {props.statusValues.length > 0 && (
              <Badge variant="secondary" className="ml-2 rounded-full">
                {props.statusValues.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search status..." />
            <CommandList>
              <CommandEmpty>No status found.</CommandEmpty>
              <CommandGroup>
                {statusOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(value) => {
                      props.setStatusValues((prev) =>
                        prev.includes(value)
                          ? prev.filter((item) => item !== value)
                          : [...prev, value]
                      );
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        props.statusValues.includes(option.value)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={props.clearFilters}
          className="h-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
        >
          <X className="mr-2 h-4 w-4" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
