import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const filters = [
  { 
    label: "Dashboard", 
    value: "dashboard", 
    description: "Overview of property and renewal insights",
    disabled: false 
  },
  { label: "Propeties", 
    value: "properties", 
    description: "All properties",
    disabled: false },
  {
    label: "Rental Renewals",
    value: "renewals",
    description: "All active renewals",
    disabled: false,
  },
];

interface PropertyTabProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  onDescriptionChange: (description: string) => void;
}

export function PropertyTabs({
  activeTab,
  onTabChange,
  onDescriptionChange,
}: PropertyTabProps) {

  const handleValueChange = (value: string) => {
    onTabChange(value);
    const filter = filters.find((f) => f.value === value);
    if (filter) {
      onDescriptionChange(filter.description);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleValueChange}>
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
