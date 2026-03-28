import { Outlet, Navigate } from "react-router";
import { useHasPropertyAccess } from "@/hooks/userrole";


export default function PropertyAutomation() {
  const { data: propertyRole, isLoading, isFetching } = useHasPropertyAccess();

  if (isLoading || isFetching) {
    return null;
  }

  if (!propertyRole?.message?.has_access) {
    return <Navigate to="/jh-digitrack/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Property Automation</h1>
        <p className="text-sm text-muted-foreground">Smart property and renewal management</p>
      </div>
      <Outlet/>
    </div>
    
  );
}
