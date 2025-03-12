import { MainNav } from "./main-nav";
import { Outlet } from "react-router";

function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <main className="flex justify-center">
        <div className="container py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;
