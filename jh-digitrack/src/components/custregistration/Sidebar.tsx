import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { LuUserPlus } from "react-icons/lu";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";


const navItems = [
  {
    icon: <LuUserPlus />,
    name: "Register",
    color: "#9A3025",
    subItems: [
      { name: "Customer Registration", path: "/jh-digitrack/customer-registration/register-customer" },
      { name: "Activate Customer", path: "/jh-digitrack/customer-registration/activate-customer" },
      { name: "Customer Search", path: "/jh-digitrack/customer-registration/customer-search" },
      { name: "Registration List", path: "/jh-digitrack/customer-registration/customer-list" },
    ],
  },
];

function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showExpandedContent, setShowExpandedContent] = useState(false);
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearExpandTimer = () => {
    if (expandTimerRef.current) {
      clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }
  };

  const openSidebar = () => {
    clearExpandTimer();
    setIsCollapsed(false);
    setShowExpandedContent(false);

    expandTimerRef.current = setTimeout(() => {
      setShowExpandedContent(true);
    }, 220);
  };

  useEffect(() => clearExpandTimer, []);

  const handleMenuClick = () => {
    if (isCollapsed) {
      openSidebar();
    }
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
      {/* Sidebar toggle */}
      <div className={`relative flex items-center ${isCollapsed ? "w-full justify-center" : "justify-end"}`}>
        <button
          type="button"
          aria-label={isCollapsed ? "Open sidebar" : "Collapse sidebar"}
          className={`absolute z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-white shadow-md transition hover:brightness-110 ${
            isCollapsed ? "top-2" : "top-3"
          }`}
          style={{
            right: "-14px",
            background: "#9A3025",
          }}
          onClick={toggleApplicationMenu}
        >
          {isCollapsed ? <IoChevronForward size={14} /> : <IoChevronBack size={14} />}
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
              onClick={handleMenuClick}
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

            {menu.subItems && showExpandedContent && (
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
