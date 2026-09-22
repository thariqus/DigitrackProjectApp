import { useState } from "react";
import { Outlet } from "react-router";
import { ShieldX } from "lucide-react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useHasCustomerRegistrationRole } from "@/hooks/userrole";

function SampleShell() {
  const [headerConfig, setHeaderConfig] = useState({ title: "", status: "" });
  const { data: customerRegAccess, isLoading } = useHasCustomerRegistrationRole();

  if (isLoading) {
    return null;
  }

  if (!customerRegAccess?.message?.has_access) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(90vh-4rem)]">
        <ShieldX className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Unauthorized Access
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          You have no access to Customer Registration.
        </p>
        <p className="text-md text-gray-500">
          Please contact your administrator for access rights.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-start gap-2 p-2">
      <div className="sticky top-2 self-start">
        <Sidebar />
      </div>

      <div className="flex min-h-[calc(100vh-1rem)] min-w-0 flex-1 flex-col gap-1">
        <header className="relative z-50 pl-2">
          <Header title={headerConfig.title} status={headerConfig.status} />
        </header>

        <main className="min-h-0 flex-1 overflow-hidden pl-2 pr-2">
          <Outlet context={{ setHeaderConfig }} />
        </main>
      </div>
    </div>
  );
}

export default SampleShell;
