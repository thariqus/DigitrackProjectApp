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
  showPropertiesTab?: boolean;
}

export function PropertyTabs({
  activeTab,
  onTabChange,
  showPropertiesTab = true,
}: PropertyTabProps) {

  const visibleFilters = showPropertiesTab
    ? filters
    : filters.filter((f) => f.value !== "properties");

  const handleValueChange = (value: string) => {
    onTabChange(value);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleValueChange}>
      <TabsList className="h-11 w-fit bg-rose-50 p-1">
        {visibleFilters.map((filter) => (
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
