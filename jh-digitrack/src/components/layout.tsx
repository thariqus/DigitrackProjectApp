import { MainNav } from "./main-nav";
import { Outlet } from "react-router";
import Username from "./ui/username";

function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <Username/>
      <main className="flex justify-center">
        <div className="container px-4 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;
