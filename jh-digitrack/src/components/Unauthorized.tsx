import { ShieldX, LogOut } from "lucide-react";
import { useLogout, useCurrentJhUser } from "../hooks/auth";
import { Navigate } from "react-router";
function Unauthorized() {
  const { mutate: logout } = useLogout();
  const { data: currentJHUser, isLoading: jhUserLoading } = useCurrentJhUser();

  if (jhUserLoading) {
    return null;
  }

  if (currentJHUser?.name) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(90vh-4rem)]">
      <ShieldX className="w-16 h-16 text-red-500 mb-4" />
      <h1 className="text-4xl font-bold text-gray-900 mb-2">
        Unauthorized Access
      </h1>
      <p className="text-xl text-gray-600 mb-2">
        Your account does not have permission to access Digitrack.
      </p>
      <p className="text-md text-gray-500 mb-4">
        Please contact your administrator for access rights.
      </p>

      <button
        onClick={() => logout()}
        className="flex items-center px-4 py-2 mt-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Logout
      </button>
    </div>
  );
}

export default Unauthorized;
