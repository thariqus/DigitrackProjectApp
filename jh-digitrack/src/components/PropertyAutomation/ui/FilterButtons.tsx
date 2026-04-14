import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type FilterOption = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (value: string) => void;
};

interface FilterButtonsProps {
  filters: FilterOption[];
  quickFilter?: {
    label: string;
    active: boolean;
    onToggle: () => void;
  };
  onClear: () => void;
}

export default function FilterButtons({
  filters,
  quickFilter,
  onClear,
}: FilterButtonsProps) {
  const hasActiveFilters =
    filters.some((f) => f.selected.length > 0) ||
    quickFilter?.active;

  return (
    <div className="flex gap-2">
      {filters.map((filter) => (
        <Popover key={filter.label}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10 border-dashed">
              <Plus className="mr-2 h-4 w-4" />
              {filter.label}
              {filter.selected.length > 0 && (
                <Badge className="ml-2">{filter.selected.length}</Badge>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder={`Search ${filter.label}`} />
              <CommandList>
                <CommandGroup>
                  {filter.options.map((option) => (
                    <CommandItem
                      key={option}
                      onSelect={() => filter.onChange(option)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          filter.selected.includes(option)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {option}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ))}

      {quickFilter && (
        <Button
          variant={quickFilter.active ? "default" : "outline"}
          onClick={quickFilter.onToggle}
        >
          {quickFilter.label}
        </Button>
      )}

      {hasActiveFilters && (
        <Button variant="ghost" className="text-primary" onClick={onClear}>
          Clear filter <X />
        </Button>
      )}
    </div>
  );
}