import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const filters = [
  {
    label: "My Tasks",
    value: "my-tasks",
    description: "Tasks that you have created and are responsible for.",
    disabled: false,
  },
  {
    label: "Created By Me",
    value: "created-by-me",
    description: "Tasks that you have created.",
    disabled: false,
  },
  {
    label: "Team Tasks",
    value: "team-tasks",
    description: "All tasks assigned to your team members.",
    disabled: false,
  },
];

interface TaskFiltersProps {
  activeFilter: string;
  onFilterChange: (value: string) => void;
  onDescriptionChange: (description: string) => void;
}

export function TaskFilters({
  activeFilter,
  onFilterChange,
  onDescriptionChange,
}: TaskFiltersProps) {
  const handleValueChange = (value: string) => {
    onFilterChange(value);
    const filter = filters.find((f) => f.value === value);
    if (filter) {
      onDescriptionChange(filter.description);
    }
  };

  return (
    <Tabs value={activeFilter} onValueChange={handleValueChange}>
      <TabsList className="h-11 w-fit bg-rose-50 p-1">
        {filters.map((filter) => (
          <TabsTrigger
            disabled={filter.disabled}
            key={filter.value}
            value={filter.value}
            className="data-[state=active]:bg-white text-gray-700 px-4"
          >
            {filter.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
