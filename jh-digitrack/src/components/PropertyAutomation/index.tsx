import { Outlet, Navigate, useLocation, useNavigate } from "react-router";
import { useHasPropertyAccess } from "@/hooks/userrole";
import { PropertyTabs } from "./ui/PropertyTabs";
import { useEffect, useState } from "react";


export default function PropertyAutomation() {

  const [description, setDescription] = useState("");
  const { data: propertyRole, isLoading, isFetching } = useHasPropertyAccess();
  const location = useLocation();
  const navigate = useNavigate();

    // get active tab from url
  const activeTab = location.pathname.includes("renewals")
    ? "renewals" :
    "properties";

  const handleTabChange = (value: string) => {
  navigate(`/jh-digitrack/property/${value}`);
  };

   useEffect(() => {
      if (activeTab === "properties") {
        setDescription("All properties to create,view, or edit");
      } else if (activeTab === "renewals") {
        setDescription("All active renewals");
      }
    }, [activeTab]);

  if (isLoading) {
  return <div>Loading...</div>; 
}

  if (!propertyRole?.message?.has_access) {
    return <Navigate to="/jh-digitrack/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Property Automation</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

       <PropertyTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onDescriptionChange={() => {}}
        />
      <Outlet context={{ propertyRole }}/>
    </div>
    
  );
}
