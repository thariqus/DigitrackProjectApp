import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
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
      { name: "Customer with Site code", path: "/jh-digitrack/customer-registration/customer-with-site-code" },
    ],
  },
];

function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showExpandedContent, setShowExpandedContent] = useState(false);
  const { pathname } = useLocation();

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
    expandTimerRef.current = setTimeout(() => setShowExpandedContent(true), 220);
  };

  useEffect(() => clearExpandTimer, []);

  const handleMenuClick = () => {
    if (isCollapsed) openSidebar();
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
      className={`sidebar-shell glass-card relative flex min-h-[calc(100vh-1rem)] flex-shrink-0 flex-col rounded-2xl py-4 transition-[width,padding] duration-300 ease-out ${
        isCollapsed ? "w-[4.5rem] items-center px-2" : "w-[14rem] items-start px-3"
      }`}
    >
      {/* Header row */}
      <div className={`relative flex h-7 w-full items-center ${isCollapsed ? "justify-center" : "justify-start"}`}>
       <span
  className={`font-semibold uppercase text-gray-400 transition-all duration-200 ${
    isCollapsed
      ? "text-[0.55rem] tracking-[0.12em]"
      : "pl-2 text-[0.65rem] tracking-[0.18em]"
  }`}
>
  Menu
</span>

        <button
          type="button"
          aria-label={isCollapsed ? "Open sidebar" : "Collapse sidebar"}
          onClick={toggleApplicationMenu}
          className="absolute top-1/2 z-20 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm ring-1 ring-black/[0.02] transition hover:border-gray-300 hover:text-gray-800 hover:shadow-md active:scale-95"
          style={{ right: isCollapsed ? "-14px" : "-15px" }}
        >
          {isCollapsed ? <IoChevronForward size={13} /> : <IoChevronBack size={13} />}
        </button>
      </div>

      {/* Divider */}
      <div className={`my-3 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent ${isCollapsed ? "w-8 self-center" : "w-full"}`} />

      {/* Navigation */}
      <ul className={`flex w-full flex-col ${isCollapsed ? "items-center gap-2" : "items-start gap-1"}`}>
        {navItems.map((menu) => {
          const sectionActive = menu.subItems?.some((s) => pathname === s.path);

          return (
            <li key={menu.name} className={`group relative w-full ${isCollapsed ? "flex justify-center" : ""}`}>
              <button
                type="button"
                onClick={handleMenuClick}
                className={`sidebar-menu-button rounded-xl transition-all duration-200 ${
                  isCollapsed
                    ? "flex h-10 w-10 items-center justify-center"
                    : "flex w-full items-center gap-3 px-2 py-2 text-left hover:bg-black/[0.03]"
                }`}
              >
                <span
                  className={`flex items-center justify-center rounded-lg text-lg transition-all duration-200 ${
                    isCollapsed ? "h-10 w-10" : "h-8 w-8"
                  } group-hover:scale-105`}
                  style={{
                    color: menu.color,
                    backgroundColor: sectionActive ? `${menu.color}1f` : `${menu.color}12`,
                    boxShadow: sectionActive ? `inset 0 0 0 1px ${menu.color}33` : "none",
                  }}
                >
                  {menu.icon}
                </span>

                {showExpandedContent && (
                  <span className="text-sm font-semibold" style={{ color: menu.color }}>
                    {menu.name}
                  </span>
                )}
              </button>

              {isCollapsed && (
  <span
    className="pointer-events-none absolute left-full top-1/2 z-[70] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
    style={{ backgroundColor: menu.color }}
  >
    {menu.name}
    <span
      className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent"
      style={{ borderRightColor: menu.color }}
    />
  </span>
)}
              {menu.subItems && showExpandedContent && (
                <ul className="sidebar-submenu relative ml-4 mt-1 flex w-full flex-col gap-0.5 border-l border-gray-200 py-1 pl-3">
                  {menu.subItems.map((sub) => {
                    const active = pathname === sub.path;

                    return (
                      <li key={sub.path} className="relative">
                        {active && (
                          <span
                            className="absolute -left-[13px] top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full"
                            style={{ backgroundColor: menu.color }}
                          />
                        )}
                        <Link
                          to={sub.path}
                          className={`sidebar-link block rounded-md px-2 py-1.5 text-[0.8rem] leading-snug transition-colors duration-150 ${
                            active ? "font-semibold" : "text-gray-600 hover:bg-black/[0.03] hover:text-gray-900"
                          }`}
                          style={active ? { color: menu.color, backgroundColor: `${menu.color}0f` } : undefined}
                        >
                          {sub.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export default Sidebar;