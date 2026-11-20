"use client";

import * as React from "react";
import { X, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Badge } from "@/components/ui/badge";

export type Option = {
  label: string;
  value: string;
  disabled?: boolean;
};

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  selectedOptions: Option[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  badgeClassName?: string;
  disabled?: boolean;
  emptyMessage?: string;
  onSearch?: (value: string) => void;
  searchKeyword?: string;
  /** Show at most this many badges in the trigger, then a "+N more" chip. Shows all when unset. */
  maxVisible?: number;
}

export function MultiSelectCombobox({
  options,
  selectedOptions,
  selected,
  onChange,
  placeholder = "Select options",
  className,
  badgeClassName,
  disabled = false,
  emptyMessage = "No options found.",
  onSearch,
  searchKeyword = "",
  maxVisible,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const visibleSelected = maxVisible === undefined ? selected : selected.slice(0, maxVisible);
  const hiddenCount = selected.length - visibleSelected.length;

  const handleUnselect = (item: string) => {
    onChange(selected.filter((i) => i !== item));
  };

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between hover:bg-background",
            selected.length > 0 ? "h-auto" : "h-10",
            className
          )}
          onClick={() => setOpen(!open)}
          disabled={disabled}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {selected.length > 0 ? (
              visibleSelected.map((item) => {
                const option = selectedOptions.find(
                  (option) => option.value === item
                );
                return (
                  <Badge
                    key={option?.value}
                    variant="secondary"
                    className={cn(
                      "max-w-[220px] animate-in duration-200 fade-in-0 gap-1 px-2 py-0.5",
                      badgeClassName
                    )}
                  >
                    <span className="truncate">{option?.label}</span>
                    <button
                      className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      type="button"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleUnselect(item);
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleUnselect(item);
                      }}
                    >
                      <X className="h-3 w-3 shrink-0 text-muted-foreground hover:text-foreground" />
                    </button>
                  </Badge>
                );
              })
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            {hiddenCount > 0 && (
              <Badge variant="outline" className="px-2 py-0.5">
                +{hiddenCount} more
              </Badge>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search options..."
            value={searchKeyword}
            onValueChange={(value) => onSearch?.(value)}
          />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    onSelect={() => handleSelect(option.value)}
                    className={cn(
                      "flex items-center gap-2",
                      option.disabled && "cursor-not-allowed opacity-60"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </div>
                    <span>{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
