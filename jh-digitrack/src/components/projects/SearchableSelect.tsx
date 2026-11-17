import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type SelectOption = { value: string; label: string };

type Props = {
  id?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  emptyMessage?: string;
  disabled?: boolean;
};

export default function SearchableSelect({ id, options, value, onChange, placeholder, emptyMessage = "No results found.", disabled = false }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedOption = options.find((option) => option.value === value);
  const filteredOptions = useMemo(
    () => options.filter((option) => option.label.toLowerCase().includes(search.toLowerCase())),
    [options, search],
  );

  return <Popover open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setSearch(""); }} modal>
    <PopoverTrigger asChild>
      <Button id={id} variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className="w-full justify-between">
        <span className={selectedOption ? "truncate" : "truncate text-muted-foreground"}>{selectedOption?.label || placeholder}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
      <Command shouldFilter={false}>
        <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} value={search} onValueChange={setSearch} />
        <CommandList>
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {filteredOptions.map((option) => <CommandItem key={option.value} value={option.value} onSelect={() => { onChange(option.value); setOpen(false); setSearch(""); }}>
              <Check className={`mr-2 h-4 w-4 ${value === option.value ? "opacity-100" : "opacity-0"}`} />{option.label}
            </CommandItem>)}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>;
}
