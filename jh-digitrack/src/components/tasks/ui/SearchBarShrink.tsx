import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { SearchBarProps } from "@/types/tasks";

export const SearchBarShrink = ({ value, onChange }: SearchBarProps) => (
  <div className="relative">
    <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
    <Input
      type="search"
      placeholder="Search tasks..."
      className="pl-7 h-7 text-[10px]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

export default SearchBarShrink;
