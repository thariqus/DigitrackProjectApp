import { useState, useEffect } from "react";
import { Plus, Check, Calendar, X } from "lucide-react";
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
import { useDocTypeMeta } from "@/hooks/doc";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { JHTasksMaster } from "@/types/JHDigitrack/JHTasksMaster";
import { useCurrentJhUser } from "@/hooks/auth";

export type TaskFilter = [string, string, string | string[] | null];

interface FilterButtonsProps {
  onFiltersChange: (filters: TaskFilter[]) => void;
  showPrivateTaskToggle?: boolean;
  tasks?: JHTasksMaster[];
  showCreatedByFilter?: boolean;
}

export default function FilterButtonsWithComboboxes({
  onFiltersChange,
  tasks = [],
  showPrivateTaskToggle = false,
  showCreatedByFilter = false,
}: FilterButtonsProps) {
  const { data: taskMeta, isLoading: isTaskMetaLoading } =
    useDocTypeMeta("JH Tasks Master");

  const [assigneeSearch, setAssigneeSearch] = useState("");

  console.log(
    tasks.map((task) => ({
      name: task[showCreatedByFilter ? "created_by_id" : "assigned_to_id"],
      full_name: task[showCreatedByFilter ? "created_by" : "assigned_to"],
    }))
  );

  const users = tasks
    .map((task) => ({
      name: task[showCreatedByFilter ? "created_by_id" : "assigned_to_id"],
      full_name: task[showCreatedByFilter ? "created_by" : "assigned_to"],
    }))
    .filter(
      (user, index, self) =>
        user.name && // Filter out undefined or empty names
        user.full_name && // Filter out undefined or empty full names
        index === self.findIndex((t) => t.name === user.name) &&
        (!assigneeSearch ||
          user.full_name.toLowerCase().includes(assigneeSearch.toLowerCase()))
    );

  const statusOptions: { value: string; label: string }[] =
    taskMeta?.fields
      ?.find(
        (field: { fieldname: string; options: string }) =>
          field.fieldname === "status"
      )
      ?.options.split("\n")
      ?.map((option: string) => ({
        value: option,
        label: option,
      })) || [];

  // Change from single value to arrays for multiselect
  const [statusValues, setStatusValues] = useState<string[]>([]);
  const [assigneeValues, setAssigneeValues] = useState<string[]>([]);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [dateOperator, setDateOperator] = useState("<=");
  const [showPrivateTasks, setShowPrivateTasks] = useState(false);

  const [openStatus, setOpenStatus] = useState(false);
  const [openAssignee, setOpenAssignee] = useState(false);
  const [openCalendar, setOpenCalendar] = useState(false);
  const { data: currentJhUser } = useCurrentJhUser();
  // Check if any filters are active
  const hasActiveFilters =
    statusValues.length > 0 ||
    assigneeValues.length > 0 ||
    date !== undefined ||
    showPrivateTasks;

  // Clear all filters
  const clearAllFilters = () => {
    setStatusValues([]);
    setAssigneeValues([]);
    setDate(undefined);
    setDateOperator("=");
    setShowPrivateTasks(false);
  };

  // Update filters when values change
  useEffect(() => {
    const activeFilters: TaskFilter[] = [];

    if (statusValues.length > 0)
      activeFilters.push(["status", "in", statusValues]);

    // Add multiple assignee filters
    if (assigneeValues.length > 0)
      activeFilters.push([
        showCreatedByFilter ? "created_by" : "assigned_to",
        "in",
        assigneeValues,
      ]);

    if (date) {
      activeFilters.push([
        "due_date",
        dateOperator,
        format(date, "yyyy-MM-dd"),
      ]);
    }

    if (showPrivateTasks) {
      activeFilters.push(["private", "=", "1"]);
      activeFilters.push(["assigned_to", "=", currentJhUser?.name || ""]);
    }

    onFiltersChange(activeFilters);
  }, [
    statusValues,
    assigneeValues,
    date,
    dateOperator,
    showPrivateTasks,
    onFiltersChange,
    showCreatedByFilter,
  ]);

  const isLoading = isTaskMetaLoading;

  if (isLoading) {
    return (
      <div className="flex flex-wrap items-center gap-4">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-28" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Popover open={openStatus} onOpenChange={setOpenStatus}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-10 border-dashed border-[#E2E8F0] bg-transparent hover:bg-transparent hover:text-[#64748B]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Status
            {statusValues.length > 0 && (
              <Badge variant="secondary" className="ml-2 rounded-full">
                {statusValues.length}
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
                {statusOptions?.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(value) => {
                      setStatusValues((prev) =>
                        prev.includes(value)
                          ? prev.filter((item) => item !== value)
                          : [...prev, value]
                      );
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        statusValues.includes(option.value)
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

      <Popover open={openAssignee} onOpenChange={setOpenAssignee}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-10 border-dashed border-[#E2E8F0] bg-transparent hover:bg-transparent hover:text-[#64748B]"
          >
            <Plus className="mr-2 h-4 w-4" />
            {showCreatedByFilter ? "Created By" : "Assignee"}
            {assigneeValues.length > 0 && (
              <Badge variant="secondary" className="ml-2 rounded-full">
                {assigneeValues.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search assignee..."
              value={assigneeSearch}
              onValueChange={setAssigneeSearch}
            />
            <CommandList>
              {isLoading ? (
                <CommandEmpty>Loading...</CommandEmpty>
              ) : users.length === 0 ? (
                <CommandEmpty>
                  {showCreatedByFilter
                    ? "No created by found."
                    : "No assignee found."}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {users.map((user) => (
                    <CommandItem
                      key={user.name}
                      value={user.name}
                      onSelect={(value) => {
                        setAssigneeValues((prev) =>
                          prev.includes(value)
                            ? prev.filter((item) => item !== value)
                            : [...prev, value]
                        );
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          assigneeValues.includes(user.name!)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {user.full_name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Popover open={openCalendar} onOpenChange={setOpenCalendar}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-10 border-dashed border-[#E2E8F0] bg-transparent hover:bg-transparent hover:text-[#64748B]"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Due Date
            {date && (
              <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                {dateOperator} {format(date, "PPP")}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-2 border-b">
            <Select value={dateOperator} onValueChange={setDateOperator}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select operator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="=">Equal to (=)</SelectItem>
                <SelectItem value=">=">
                  {"Greater than or equal to (>=)"}
                </SelectItem>
                <SelectItem value="<=">
                  {"Less than or equal to (<=)"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CalendarComponent
            mode="single"
            selected={date}
            onSelect={(newDate) => {
              setDate(newDate);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        className="h-10 border-dashed border-[#E2E8F0] bg-transparent hover:bg-transparent hover:text-[#64748B]"
        disabled
      >
        <Plus className="mr-2 h-4 w-4" />
        Projects
      </Button>

      {/* Private Task Toggle */}
      {showPrivateTaskToggle && (
        <div className="flex items-center space-x-2">
          <Switch
            id="private-tasks"
            checked={showPrivateTasks}
            onCheckedChange={(checked: boolean) => {
              setShowPrivateTasks(checked);
            }}
          />
          <label
            htmlFor="private-tasks"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Private Tasks
          </label>
        </div>
      )}

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="h-10 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
        >
          <X className="mr-2 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
