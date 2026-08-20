import { useState } from "react";
import { Outlet } from "react-router";
import Sidebar from "./Sidebar";
import Header from "./Header";

function SampleShell() {
  const [headerConfig, setHeaderConfig] = useState({ title: "", status: "" });

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
