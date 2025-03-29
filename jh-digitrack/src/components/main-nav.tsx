import { cn } from "@/lib/utils";
import {
  ListTodo,
  Calendar,
  User,
  FolderKanban,
  ClipboardCheck,
  FolderOpenDot,
} from "lucide-react";
import { Link, useLocation } from "react-router";
import JHLogo from "@/assets/digitrack-logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useCurrentJhUser, useLogout } from "@/hooks/auth";
import {
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenu,
} from "./ui/navigation-menu";

export function MainNav() {
  const { pathname } = useLocation();
  const { data: currentJhUser } = useCurrentJhUser();
  const { mutate: logout } = useLogout();

  const className = (path: string) =>
    cn(
      "flex items-center gap-2 hover:text-primary",
      pathname !== path ? "text-gray-600" : "font-medium text-primary"
    );

  return (
    <header className="border-b">
      <div className="flex h-16 items-center px-4 md:px-6">
        <Link to="" className="flex items-center gap-2">
          <img
            src={JHLogo}
            alt="Jaleel Holdings Logo"
            width={120}
            height={40}
            className="h-10 w-auto"
          />
        </Link>
        <nav className="ml-auto flex items-center gap-4 md:gap-6">
          <Link to="tasks" className={className("/tasks")}>
            <ListTodo className="h-5 w-5" />
            <span>Tasks</span>
          </Link>
          <Link to="audits" className={className("/audits")}>
            <ClipboardCheck className="h-5 w-5" />
            <span>Audits</span>
          </Link>
          <NavigationMenu>
            <NavigationMenuItem className="list-none">
              <NavigationMenuTrigger>
                <div className="flex items-center gap-2">
                  <FolderOpenDot className="h-5 w-5" />
                  Projects
                </div>
              </NavigationMenuTrigger>

              <NavigationMenuContent>
                <ul className="flex flex-col w-[200px] gap-3 p-4 sm:w-[250px] md:w-[300px]">
                  <Link
                    to="projects"
                    className={cn(
                      className("/projects"),
                      "opacity-50 pointer-events-none"
                    )}
                    aria-disabled="true"
                  >
                    <FolderKanban className="h-5 w-5" />
                    <span className="flex items-center gap-2">
                      TS Projects
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                        Coming Soon
                      </span>
                    </span>
                  </Link>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenu>

          <Link to="meetings" className={className("/meetings")}>
            <Calendar className="h-5 w-5" />
            <span>Meetings</span>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-4" aria-label="User profile">
                <User className="h-8 w-8 rounded-full bg-gray-100 p-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <div className="flex items-center p-2 gap-3">
                <div className="rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center">
                  <User className="h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold">
                    {currentJhUser?.full_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {currentJhUser?.email}
                  </span>
                </div>
              </div>
              <DropdownMenuSeparator />
              {currentJhUser?.is_head_of_department ? (
                <DropdownMenuItem
                  onClick={() => {
                    window.location.href = "/app";
                  }}
                >
                  <span>Switch To Desk</span>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem asChild>
                <Link to="/jh-digitrack/recycle-bin" className="w-full">
                  <span>Recycle Bin</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="w-full" onClick={() => logout()}>
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
