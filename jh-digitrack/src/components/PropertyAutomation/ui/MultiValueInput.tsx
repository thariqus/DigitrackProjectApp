import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type MultiValueInputProps = {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

const parseValues = (value?: string | null) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export default function MultiValueInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
}: MultiValueInputProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const values = useMemo(() => parseValues(value), [value]);

  const commitValue = (rawValue: string) => {
    const nextValue = rawValue.trim();
    if (!nextValue) return;
    if (values.includes(nextValue)) {
      setDraft("");
      return;
    }

    onChange([...values, nextValue].join(", "));
    setDraft("");
  };

  const removeValue = (valueToRemove: string) => {
    onChange(values.filter((item) => item !== valueToRemove).join(", "));
  };

  return (
    <div
      className={cn(
        "flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
      onClick={() => {
        if (disabled) return;
        inputRef.current?.focus();
      }}
    >
      {values.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-foreground"
        >
          {item}
          {!disabled && (
            <button
              type="button"
              className="rounded-full text-muted-foreground transition hover:text-foreground"
              onClick={() => removeValue(item)}
              aria-label={`Remove ${item}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}

      <Input
        ref={inputRef}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => commitValue(draft)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            commitValue(draft);
          }

          if (event.key === "Backspace" && !draft && values.length > 0) {
            removeValue(values[values.length - 1]);
          }
        }}
        placeholder={values.length === 0 ? placeholder : ""}
        className="h-auto min-w-[140px] flex-1 border-0 p-0 shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
