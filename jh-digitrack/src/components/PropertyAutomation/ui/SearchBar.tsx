import { memo } from "react";
import { Input } from "@/components/ui/input";
import { SearchBarProps } from "@/types/PropertyAutomation";
import { Search } from "lucide-react";

const SearchBar = memo(({ value, onChange, placeholder }: SearchBarProps) => (
  <div className="relative">
    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
    <Input
      type="search"
      placeholder={placeholder}
      className="pl-8"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
));

export { SearchBar };
export default SearchBar;
