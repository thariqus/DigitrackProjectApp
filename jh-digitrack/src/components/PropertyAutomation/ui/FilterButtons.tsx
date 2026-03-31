import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
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
import { cn } from "@/lib/utils";
import { Check, Plus, X } from "lucide-react";
import { useState } from "react";

interface FilterButtonsProps {
  emirateOptions: string[];
  typeOptions: string[];
  divisionOptions: string[];

  selectedEmirate: string[];
  selectedType: string[];
  selectedDivision: string[];
  expiringSoon: boolean;

  onEmirateChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onDivisionChange: (value: string) => void;
  onExpiringSoonToggle: () => void;

  onClear: () => void;
}

export default function FilterButtons({
  emirateOptions = [],
  typeOptions = [],
  divisionOptions = [],

  selectedEmirate,
  selectedType,
  selectedDivision,
  expiringSoon,

  onEmirateChange,
  onTypeChange,
  onDivisionChange,
  onExpiringSoonToggle,
  onClear,
}: FilterButtonsProps) {
  const [openEmiratesFilter, setOpenEmiratesFilter] = useState(false);
  const [openTypesFilter, setOpenTypesFilter] = useState(false);

  const hasActiveFilters =
  selectedEmirate.length > 0 ||
  selectedType.length > 0 ||
  selectedDivision.length > 0 ||
  expiringSoon;

  return (
    <div className="flex gap-2">

      {/* Emirates */}
      <Popover open={openEmiratesFilter} onOpenChange={setOpenEmiratesFilter}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10 border-dashed">
            <Plus className="mr-2 h-4 w-4" />
            Emirates
            {selectedEmirate.length > 0 && (
              <Badge className="ml-2">{selectedEmirate.length}</Badge>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search emirates..." />
            <CommandList>
              <CommandEmpty>No emirates found.</CommandEmpty>
              <CommandGroup>
                {emirateOptions.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => {
                      onEmirateChange(option);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedEmirate.includes(option)
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

      {/* Types */}
      <Popover open={openTypesFilter} onOpenChange={setOpenTypesFilter}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10 border-dashed">
            <Plus className="mr-2 h-4 w-4" />
            Types
            {selectedType.length > 0 && (
              <Badge className="ml-2">{selectedType.length}</Badge>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search types..." />
            <CommandList>
              <CommandEmpty>No types found.</CommandEmpty>
              <CommandGroup>
                {typeOptions.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => {
                      onTypeChange(option);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedType.includes(option)
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

      {/* Division */}
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" className="h-10 border-dashed">
      <Plus className="mr-2 h-4 w-4" />
      Division
      {selectedDivision.length > 0 && (
        <Badge className="ml-2">{selectedDivision.length}</Badge>
      )}
    </Button>
  </PopoverTrigger>

  <PopoverContent className="w-[200px] p-0">
    <Command>
      <CommandInput placeholder="Search division..." />
      <CommandList>
        <CommandGroup>
          {divisionOptions.map((option) => (
            <CommandItem
              key={option}
              onSelect={() => onDivisionChange(option)}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  selectedDivision.includes(option)
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

<Button
  variant={expiringSoon ? "default" : "outline"}
  className="h-10"
  onClick={onExpiringSoonToggle}
>
   Expiring Soon
</Button>

      {/* Clear */}
      {hasActiveFilters && (
        <Button className="text-primary" variant="ghost" onClick={onClear}>
          Clear filter 
          <X />
        </Button>
      )}
    </div>
  );
}