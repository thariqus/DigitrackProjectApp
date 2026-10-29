import { useState } from "react";
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
  Warehouse,
  LayoutGrid,
  ChevronDown,
  Mail,
  UserPlus,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
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
import { useHasPmsAccess, useHasPropertyAccess, useHasCustomerRegistrationRole } from "@/hooks/userrole";
import { useDelegationPanel } from "@/context/DelegationPanelContext";

export function MainNav() {
  const { pathname } = useLocation();
  const { data: currentJhUser } = useCurrentJhUser();
  const { data: appVersion } = useAppVersion();
  const { mutate: logout } = useLogout();
  const navigate = useNavigate()
  const { setOpen } = useDelegationPanel();
  const [isAppsOpen, setIsAppsOpen] = useState(false);
 
 

  const segments = pathname.split("/");
  const isPropertyActive = segments.includes("property");

  const className = (path: string[]) => {
    return cn(
      "flex items-center gap-2 hover:text-primary",
      !isPropertyActive && path?.some((p) => p === segments[segments.length - 1])
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
  const { data: propertyRole, isLoading: isPropertyRoleLoading, isFetching: isPropertyRoleFetching } = useHasPropertyAccess();
  const { data: customerRegRole } = useHasCustomerRegistrationRole();

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

        <nav className="ml-auto  flex items-center gap-3 md:gap-6">
          <div className="ml-auto flex items-center gap-3 md:gap-3 overflow-y-auto text-nowrap">
              <Link to="dashboard" className={className(["dashboard"])}>
            <LayoutDashboard  className="h-5 w-5" />
            <span>Dashboard</span>
          </Link>

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

          <DropdownMenu open={isAppsOpen} onOpenChange={setIsAppsOpen}>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 transition-colors  hover:text-primary data-[state=open]:bg-white/70 data-[state=open]:text-primary data-[state=open]:shadow-sm data-[state=open]:backdrop-blur-md">
                <LayoutGrid className="h-5 w-5" />
                <span>Applications</span>
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="relative w-[600px] overflow-hidden rounded-2xl border border-white/50 bg-white/60 p-3 shadow-2xl shadow-black/10 ring-1 ring-black/5 backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/40 before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/40 before:via-transparent before:to-white/10"
              align="end"
            >
              <div className="relative mb-2 border-b border-white/50 px-1 pt-1 pb-2">
                <p className="text-sm font-semibold text-gray-900">Applications</p>
                <p className="text-xs text-muted-foreground">
                  Quick access to your workflows
                </p>
              </div>
              <div className="relative grid grid-cols-3 gap-2">
                
                 <button
                  onClick={() => {
                    setIsAppsOpen(false);
                    window.location.href = "/app/travel-request";
                  }}
                  className="group flex items-center gap-2 rounded-xl p-1 text-center transition-all duration-200 hover:bg-white/50 hover:shadow-sm hover:backdrop-blur-md"
                >
                  <span className="flex h-10 w-10 items-center justify-center   rounded-2xl bg-primary/15 text-primary shadow-inner shadow-primary/10 ring-1 ring-primary/25 border border-primary/20 backdrop-blur-md backdrop-saturate-150 transition-all duration-200 group-hover:scale-105 group-hover:bg-primary/25 group-hover:shadow-primary/20">
                    <Gauge className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-medium text-gray-700">Travel Desk</span>
                </button>
                 <button
                  onClick={() => {
                    if (!pmsRole?.message?.has_access) {
                      alert("You have no access to PMS Lite. Please contact admin.");
                      return;
                    }
                    setIsAppsOpen(false);
                    window.location.href = "/PMS";
                  }}
                  className="group flex items-center  gap-2 rounded-xl p-1 text-center transition-all duration-200 hover:bg-white/50 hover:shadow-sm hover:backdrop-blur-md"
                >
                  <span className="flex h-10 w-10 items-center justify-center  rounded-2xl bg-primary/15 text-primary shadow-inner shadow-primary/10 ring-1 ring-primary/25 border border-primary/20 backdrop-blur-md backdrop-saturate-150 transition-all duration-200 group-hover:scale-105 group-hover:bg-primary/25 group-hover:shadow-primary/20">
                    <LineChart className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-medium text-gray-700">J- Reflect</span>
                </button>

                <button
                  onClick={() => {
                    if (isPropertyRoleLoading || isPropertyRoleFetching) {
                      return;
                    }

                    if (!propertyRole?.message?.has_access) {
                      alert("You have no access to Property Automation. Please contact admin.");
                      return;
                    }
                    setIsAppsOpen(false);
                    navigate("property")
                  }}
                  className="group flex items-center  gap-2 rounded-xl p-1 text-center transition-all duration-200 hover:bg-white/50 hover:shadow-sm hover:backdrop-blur-md"
                >
                  <span className="flex h-10 w-10 items-center justify-center   rounded-2xl bg-primary/15 text-primary shadow-inner shadow-primary/10 ring-1 ring-primary/25 border border-primary/20 backdrop-blur-md backdrop-saturate-150 transition-all duration-200 group-hover:scale-105 group-hover:bg-primary/25 group-hover:shadow-primary/20">
                    <Warehouse className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-medium text-gray-700">Property Automation</span>
                </button>
                  <button
                  onClick={() => {
                    if (!customerRegRole?.message?.has_access) {
                      alert("You have no access to Customer Registration. Please contact admin.");
                      return;
                    }
                    setIsAppsOpen(false);
                    navigate("customer-registration")
                  }}
                  className="group flex items-center  gap-2 rounded-xl p-1 text-center transition-all duration-200 hover:bg-white/50 hover:shadow-sm hover:backdrop-blur-md"
                >
                  <span className="flex h-10 w-10 items-center justify-center  rounded-2xl bg-primary/15 text-primary shadow-inner shadow-primary/10 ring-1 ring-primary/25 border border-primary/20 backdrop-blur-md backdrop-saturate-150 transition-all duration-200 group-hover:scale-105 group-hover:bg-primary/25 group-hover:shadow-primary/20">
                    <UserPlus className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-medium text-gray-700">Customer Registration</span>
                </button>

                <div className="col-span-3  border-t border-gray-200"></div>

                 <Link
                  to="jrc-permission"
                  onClick={() => setIsAppsOpen(false)}
                  className="group flex items-center  gap-2 rounded-xl p-1 text-center transition-all duration-200 hover:bg-white/50 hover:shadow-sm hover:backdrop-blur-md"
                >
                  <span className="flex h-10 w-10 items-center justify-center   rounded-2xl bg-primary/15 text-primary shadow-inner shadow-primary/10 ring-1 ring-primary/25 border border-primary/20 backdrop-blur-md backdrop-saturate-150 transition-all duration-200 group-hover:scale-105 group-hover:bg-primary/25 group-hover:shadow-primary/20">
                    <FolderOpenDot className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-medium text-gray-700">JRC Explorer</span>
                </Link>

                 <Link
                  to="idle-assets"
                  onClick={() => setIsAppsOpen(false)}
                  className="group flex items-center  gap-2 rounded-xl p-1 text-center transition-all duration-200 hover:bg-white/50 hover:shadow-sm hover:backdrop-blur-md"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner shadow-primary/10 ring-1 ring-primary/25 border border-primary/20 backdrop-blur-md backdrop-saturate-150 transition-all duration-200 group-hover:scale-105 group-hover:bg-primary/25 group-hover:shadow-primary/20">
                    <Recycle className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-medium text-gray-700">Idle Assets</span>
                </Link>
                <Link
                  to="email"
                  onClick={() => setIsAppsOpen(false)}
                  className="group flex items-center gap-2 rounded-xl p-1 text-center transition-all duration-200 hover:bg-white/50 hover:shadow-sm hover:backdrop-blur-md"
                >
                  <span className="flex h-10 w-10 items-center justify-center  rounded-2xl bg-primary/15 text-primary shadow-inner shadow-primary/10 ring-1 ring-primary/25 border border-primary/20 backdrop-blur-md backdrop-saturate-150 transition-all duration-200 group-hover:scale-105 group-hover:bg-primary/25 group-hover:shadow-primary/20">
                    <Mail className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-medium text-gray-700">Email</span>
                </Link>
               
               
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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
                  onSelect={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    requestAnimationFrame(() => {
                      setOpen(true);
                    });
                  }}
                >
                  <span>Manage Delegation</span>
                </DropdownMenuItem>

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
