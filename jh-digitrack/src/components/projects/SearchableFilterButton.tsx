import { useState } from "react";
import { CalendarDays, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type SearchableFilterOption = { value: string; label: string };

type Props = {
  label: string;
  value: string;
  options: SearchableFilterOption[];
  onChange: (value: string) => void;
  searchPlaceholder?: string;
  icon?: "plus" | "calendar";
};

export default function SearchableFilterButton({
  label,
  value,
  options,
  onChange,
  searchPlaceholder = `Search ${label.toLowerCase()}...`,
  icon = "plus",
}: Props) {
  const [open, setOpen] = useState(false);
  const Icon = icon === "calendar" ? CalendarDays : Plus;
  const selectedLabel = options.find((option) => option.value === value)?.label;

  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button variant="outline" className="h-10 border-dashed border-[#E2E8F0] bg-transparent">
        <Icon className="mr-2 h-4 w-4" />{label}
        {selectedLabel && <span className="ml-2 max-w-36 truncate rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{selectedLabel}</span>}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-[220px] p-0" align="start">
      <Command>
        <CommandInput placeholder={searchPlaceholder} />
        <CommandList>
          <CommandEmpty>No options found.</CommandEmpty>
          <CommandGroup>
            <CommandItem value={`All ${label}`} onSelect={() => { onChange(""); setOpen(false); }}>
              <Check className={`mr-2 h-4 w-4 ${value ? "opacity-0" : "opacity-100"}`} />All {label}
            </CommandItem>
            {options.map((option) => <CommandItem key={option.value} value={option.label} onSelect={() => { onChange(option.value); setOpen(false); }}>
              <Check className={`mr-2 h-4 w-4 ${value === option.value ? "opacity-100" : "opacity-0"}`} />{option.label}
            </CommandItem>)}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>;
}
