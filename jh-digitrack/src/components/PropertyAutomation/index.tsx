import { Outlet, Navigate, useLocation, useNavigate } from "react-router";
import { useHasPropertyAccess } from "@/hooks/userrole";
import { PropertyTabs } from "./ui/PropertyTabs";
import { useEffect, useState } from "react";
import { useCurrentJhUser } from "@/hooks/auth";
import { useUserAccess } from "./hooks/useProperty";


export default function PropertyAutomation() {

  const [description, setDescription] = useState("");
  const { data: propertyRole, isLoading } = useHasPropertyAccess();
  const { data: currentJhUser } = useCurrentJhUser();
  const { data: userAccess } = useUserAccess();
  const location = useLocation();
  const navigate = useNavigate();

    // get active tab from url
  const activeTab = location.pathname.includes("dashboard")
  ? "dashboard"
  : location.pathname.includes("renewals")
  ? "renewals"
  : "properties";

  const handleTabChange = (value: string) => {
  navigate(`/jh-digitrack/property/${value}`);
  };

   useEffect(() => {
  if (activeTab === "dashboard") {
    setDescription("Overview of property and renewal insights");
  } else if (activeTab === "properties") {
    setDescription("All properties to create, view, or edit");
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

  // FC, CFO, and GL Team cannot view the Properties tab
  const canSeePropertiesTab = !userAccess?.is_fc && !userAccess?.is_cfo && !userAccess?.has_gl_team_role;

  // Redirect away from the properties route if the user has no access to it
  if (userAccess && !canSeePropertiesTab && activeTab === "properties") {
    return <Navigate to="/jh-digitrack/property/dashboard" replace />;
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
          showPropertiesTab={canSeePropertiesTab}
        />
      <Outlet context={{ propertyRole, currentJhUser, userAccess }} />
    </div>

  );
}
