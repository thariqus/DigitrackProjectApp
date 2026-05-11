import { cn } from "@/lib/utils";
import {
  ListTodo,
  Calendar,
  User,
  ClipboardCheck,
  FolderOpenDot,
  Search,
  Recycle,
  LayoutDashboard,
  Gauge,
  Users,
  LineChart,
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
import { useAppVersion } from "@/hooks/system";
import { JHDigitrackSettings } from "@/types/JHDigitrack/JHDigitrackSettings";
import { useDocDetail } from "@/hooks/doc";
import { useHasPmsAccess } from "@/hooks/userrole";

export function MainNav() {
  const { pathname } = useLocation();
  const { data: currentJhUser } = useCurrentJhUser();
  const { data: appVersion } = useAppVersion();
  const { mutate: logout } = useLogout();

  const className = (path: string[]) => {
    return cn(
      "flex items-center gap-2 hover:text-primary",
      path?.some((p) => p === pathname.split("/").pop())
        ? "font-medium text-primary"
        : "text-gray-600"
    );
  };

  const { data: attachmentDetailed } = useDocDetail<JHDigitrackSettings>({
    doctype: "JH Digitrack Settings",
    name: "JH Digitrack Settings",
  });

  const attachment = attachmentDetailed?.docs[0];
  const { data: pmsRole } = useHasPmsAccess();

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
          <Link to="dashboard" className={className(["dashboard"])}>
            <LayoutDashboard  className="h-5 w-5" />
            <span>Dashboard</span>
          </Link>
          <Link to="tasks" className={className(["tasks"])}>
            <ListTodo className="h-5 w-5" />
            <span>Tasks</span>
          </Link>
          <Link to="audits" className={className(["audits"])}>
            <ClipboardCheck className="h-5 w-5" />
            <span>Audits</span>
          </Link>
          <Link to="meetings" className={className(["meetings"])}>
            <Calendar className="h-5 w-5" />
            <span>Meetings</span>
          </Link>


          <button
            onClick={() => {
              window.location.href = "/app/travel-request";
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-primary"
          >
            <Gauge className="h-5 w-5" />
            <span>Travel Dashboard</span>
          </button>

          <button
            onClick={() => {
              window.location.href =
                "https://digitrack.jaleelholdings.com/employee_search";
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-primary"
          >
            <Users className="h-5 w-5" />
            <span>Employee Lookup</span>
          </button>

          <button
            onClick={() => {
              if (!pmsRole?.message?.has_access) {
                alert("You have no access to PMS Lite. Please contact admin.");
                return;
              }
              window.location.href = "/PMS";
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-primary"
          >
            <LineChart className="h-5 w-5" />
            <span>PMS Lite</span>
          </button>

          {/* Divider */}
          <span className="border h-10 border-gray-200"></span>

          {/* Search */}
          <Link to="search" className={className(["search"])}>
            <Search className="h-5 w-5" />
            <span>Search</span>
          </Link>

          {/* User Dropdown */}
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

              {Boolean(currentJhUser?.is_head_of_department) && (
                <DropdownMenuItem
                  onClick={() => {
                    window.location.href = "/app/jh-digitrack-settings";
                  }}
                >
                  <span>Switch To Desk</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={() => {
                  window.location.href = "/me";
                }}
              >
                <span>Account Settings</span>
              </DropdownMenuItem>

              {attachment?.user_manual && (
                <DropdownMenuItem
                  onClick={() => {
                    window.open(attachment?.user_manual);
                  }}
                >
                  <span>User Manual</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                className="w-full"
                onSelect={(e) => {
                  e.preventDefault(); 
                  logout();
                }}
              >

                <span>Log out</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div
                className="p-2 text-xs text-center text-gray-400 cursor-default"
                onClick={() => {
                  navigator.clipboard.writeText(appVersion);
                }}
              >
                <span className="font-semibold">Version: </span>
                {appVersion}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
