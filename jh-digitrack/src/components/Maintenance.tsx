import { Construction } from "lucide-react";
import { useCurrentUser } from "../hooks/auth";
import { useMaintenanceMode } from "@/hooks/system";
import { format } from "date-fns";
import { Navigate } from "react-router";
function Maintenance() {
  const { data: currentUser } = useCurrentUser();
  const { data: maintenanceMode, isLoading: maintenanceModeLoading } =
    useMaintenanceMode();

  if (maintenanceModeLoading) {
    return null;
  }

  if (!maintenanceMode?.message?.maintenance_mode) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(90vh-4rem)]">
      <Construction className="w-16 h-16 text-red-500 mb-4" />
      <h1 className="text-4xl font-bold text-gray-900 mb-2">
        Maintenance Mode
      </h1>
      <p className="text-xl text-gray-600 mb-2">
        The Digitrack is currently under maintenance. Please try after{" "}
        {format(
          new Date(maintenanceMode?.message?.maintenance_to),
          "dd MMM yyyy h:mm a"
        )}
      </p>

      {currentUser === "Administrator" && (
        <button
          onClick={() => {
            window.location.href = "/app/jh-digitrack-settings";
          }}
          className="flex items-center px-4 py-2 mt-4 text-sm font-medium text-gray-700 bg-transparent border-none rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
        >
          Switch to Desk
        </button>
      )}
    </div>
  );
}

export default Maintenance;
