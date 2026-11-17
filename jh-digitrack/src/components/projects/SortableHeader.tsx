import { ArrowDown, ArrowUp } from "lucide-react";

type Props = {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
  align?: "left" | "center";
};

export default function SortableHeader({ label, active, direction, onClick, align = "left" }: Props) {
  return <th className={`px-2 py-3 font-medium ${align === "center" ? "text-center" : "text-left"}`}>
    <button type="button" className={`inline-flex items-center gap-1 hover:text-foreground ${align === "center" ? "justify-center text-center" : "justify-start text-left"}`} onClick={onClick}>
      {label}
      {active && (direction === "asc" ? <ArrowUp className="h-3.5 w-3.5"/> : <ArrowDown className="h-3.5 w-3.5"/>)}
    </button>
  </th>;
}
