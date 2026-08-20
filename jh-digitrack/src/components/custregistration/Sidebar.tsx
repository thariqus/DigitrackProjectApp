import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { LuUserPlus } from "react-icons/lu";
import DigitrackLogo from "@/assets/digitrack-logo.png";
import JHIcon from "@/assets/jh-logo.png";

const navItems = [
  {
    icon: <LuUserPlus />,
    name: "Register",
    color: "#972E26",
    subItems: [
      { name: "Register as New Customer", path: "/jh-digitrack/sample/register-customer" },
      { name: "Activate Customer", path: "/jh-digitrack/sample/activate-customer" },
      { name: "Customer Search", path: "/jh-digitrack/sample/customer-search" },
      { name: "View Registered Customer", path: "/jh-digitrack/sample/customer-list" },
    ],
  },
];

function Sidebar() {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showExpandedContent, setShowExpandedContent] = useState(false);
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearExpandTimer = () => {
    if (expandTimerRef.current) {
      clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }
  };

  const openSidebar = (nextDropdown: string | null = null) => {
    clearExpandTimer();
    setIsCollapsed(false);
    setShowExpandedContent(false);

    expandTimerRef.current = setTimeout(() => {
      setShowExpandedContent(true);
      if (nextDropdown) setOpenDropdown(nextDropdown);
    }, 220);
  };

  useEffect(() => clearExpandTimer, []);

  const toggleDropdown = (name: string) => {
    if (isCollapsed) {
      openSidebar(name);
      return;
    }

    setOpenDropdown((prev) => (prev === name ? null : name));
  };

  const toggleApplicationMenu = () => {
    if (isCollapsed) {
      openSidebar();
      return;
    }

    clearExpandTimer();
    setShowExpandedContent(false);
    setIsCollapsed(true);
  };

  return (
    <aside
      className={`sidebar-shell glass-card relative flex min-h-[calc(100vh-1rem)] flex-shrink-0 flex-col overflow-hidden rounded-xl py-4 transition-[width,padding] duration-300 ${
        isCollapsed ? "w-18 items-center px-2" : "w-54 px-4"
      }`}
    >
      {/* Logo */}
      <div className={`relative flex items-center ${isCollapsed ? "w-full justify-center" : "justify-between"}`}>
        {isCollapsed ? (
          <img src={JHIcon} alt="JH" className="h-8 w-8 object-contain" />
        ) : (
          <img src={DigitrackLogo} alt="JH DigiTrack" className="h-12 w-auto object-contain" />
        )}

        <button
          type="button"
          aria-label={isCollapsed ? "Open sidebar" : "Collapse sidebar"}
          className={`absolute z-10 cursor-pointer rounded-full p-1 text-gray-700 ${isCollapsed ? "top-2" : "top-3"}`}
          style={{
            right: isCollapsed ? "-12px" : "-21px",
            background: "rgba(231, 231, 231, 0.9)",
          }}
          onClick={toggleApplicationMenu}
        >
          {isCollapsed ? "›" : "‹"}
        </button>
      </div>

      <p className={`text-gray-400 ${isCollapsed ? "mb-0.5 mt-1 text-center text-xs leading-none" : "mb-3 pl-3 text-sm"}`}>
        Menu
      </p>

      <ul className={`flex flex-col ${isCollapsed ? "mt-0 w-full items-center gap-0" : "mt-1 gap-2"}`}>
        {navItems.map((menu) => (
          <li key={menu.name} className={`relative group ${isCollapsed ? "flex w-full justify-center" : "w-full"}`}>
            <button
              type="button"
              onClick={() => toggleDropdown(menu.name)}
              className={`sidebar-menu-button rounded-lg transition hover:bg-gray-100 ${
                isCollapsed ? "flex h-7 w-7 items-center justify-center" : "flex w-full items-center gap-3 px-3 py-2 text-left"
              }`}
            >
              <span className="flex items-center justify-center text-xl" style={{ color: menu.color }}>
                {menu.icon}
              </span>

              {showExpandedContent && (
                <span className="font-medium" style={{ color: menu.color }}>
                  {menu.name}
                </span>
              )}
            </button>

            {menu.subItems && openDropdown === menu.name && showExpandedContent && (
              <ul className="sidebar-submenu mt-2 flex w-full flex-col gap-3 rounded-lg border-l border-gray-300 py-2 pl-6">
                {menu.subItems.map((sub) => (
                  <li key={sub.path}>
                    <Link to={sub.path} className="sidebar-link block text-sm text-gray-700 transition hover:text-primary">
                      {sub.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default Sidebar;
