import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import JHICON from "../images/JH.png";
import jaleelholdings from "../images/jaleel holdings.png";
import { useCurrentPmsEmployee } from "../hooks/auth";

import {
  ChevronDown,
  MoreHorizontal,
} from "lucide-react";

import { useSidebar } from "../context/SidebarContext";
import { IoClipboardOutline } from "react-icons/io5";
import { MdOutlineAssignmentTurnedIn, MdOutlineAssessment } from "react-icons/md";
import { FaRegChartBar } from "react-icons/fa";
import { IoSettingsOutline } from "react-icons/io5";
import { FaTasks } from "react-icons/fa";
import { AiOutlineEye } from "react-icons/ai"; 

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  fromAdmin?: boolean;
};

const masterItems: NavItem[] = [
  {
    icon: <IoClipboardOutline />,
    name: "Goal",
    path: "/goalmaster",
  },
];

const managerItems: NavItem[] = [
  {
    icon: <FaRegChartBar />,
    name: "View",
    path: "/reports",
    fromAdmin: false,
  },
  {
    icon: <MdOutlineAssignmentTurnedIn />,
    name: "Goal Assignment",
    path: "/goalassignment",
  },
  {
    icon: <MdOutlineAssessment />,
    name: "Goal Evaluation",
    path: "/goalevaluation",
  },
];

const selfItems: NavItem[] = [
  {
    icon: <FaRegChartBar />,
    name: "View",
    path: "/self-evaluation",
    fromAdmin: false,
  },
  {
    icon: <MdOutlineAssignmentTurnedIn />,
    name: "Goal Assignment",
  },
  {
    icon: <MdOutlineAssessment />,
    name: "Self Assessment",
  },
];

const adminItems: NavItem[] = [
  {
    icon: <FaRegChartBar />,
    name: "View",
    path: "/admin-report",
    fromAdmin: true,
  },
  {
    icon: <IoSettingsOutline />,
    name: "Settings",
    path: "/adminsettings",
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered } = useSidebar();
  const location = useLocation();
  const { data: employee } = useCurrentPmsEmployee();

  // const isActive = useCallback(
  //   (path: string) => location.pathname === path,
  //   [location.pathname]
  // );
  // const isActive = useCallback(
  //   (nav: NavItem) => {
  //     return (
  //       location.pathname === nav.path &&
  //       (location.state?.fromAdmin ?? false) === (nav.fromAdmin ?? false)
  //     );
  //   },
  //   [location.pathname, location.state]
  // );

  const isActive = useCallback(
    (nav: NavItem) => {
      if (!nav.path) return false;

      if (nav.path.startsWith("/self")) {
        return location.pathname.startsWith(nav.path);
      }

      if (nav.fromAdmin !== undefined) {
        return (
          location.pathname === nav.path &&
          (location.state?.fromAdmin ?? false) === nav.fromAdmin
        );
      }

      return location.pathname === nav.path;
    },
    [location.pathname, location.state]
  );



  const renderMenuItems = (items: NavItem[], hasLink = true) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav) => (
        <li key={nav.name}>
          {hasLink && nav.path ? (
            // <Link
            //   to={nav.path}
            //   className={`menu-item group text-xs ${
            //     isActive(nav.path)
            //       ? "menu-item-active"
            //       : "menu-item-inactive"
            //   }`}
            // >
            <Link
              to={nav.path}
              state={{ fromAdmin: nav.fromAdmin || false }}
              className={`menu-item group text-xs ${
                isActive(nav) ? "menu-item-active" : "menu-item-inactive"
              }`}
            >

              <span
                className={`menu-item-icon-size ${
                  isActive(nav)
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
            </Link>
          ) : (
            <div
              className={`menu-item group menu-item-inactive cursor-default`}
            >
              <span className="menu-item-icon-size text-gray-500">
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text text-gray-700">{nav.name}</span>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  const renderSectionHeader = (title: string) => (
    <h2
      className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
        !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
      }`}
    >
      {isExpanded || isHovered || isMobileOpen ? (
        title
      ) : (
        <MoreHorizontal className="size-6" />
      )}
    </h2>
  );

  return (
    <aside
      className={`fixed mt-3 flex flex-col lg:mt-0 top-0 px-2 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[200px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
    >
      <div
        className={`py-5 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <img
                className="dark:hidden"
                src={jaleelholdings}
                alt="Logo"
                width={100}
                height={40}
              />
              <img
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <img src={JHICON} alt="Logo" width={32} height={32} />
          )}
        </Link>
      </div>

      <div className="flex flex-col text-sm overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          {/* Conditionally render based on PMS Employee flags */}
          {employee?.pms_master ? (
            <>
              {renderSectionHeader("Master")}
              {renderMenuItems(masterItems)}
            </>
          ) : null}

          {employee?.pms_manager ? (
            <div className="mt-8">
              {renderSectionHeader("Manager")}
              {renderMenuItems(managerItems)}
            </div>
          ) : null}

          {employee?.pms_employee || employee?.self_assessment ? (
            <div className="mt-8">
              {renderSectionHeader("Self")}
              {renderMenuItems(selfItems)}
            </div>
          ) : null}

          {employee?.pms_admin ? (
            <div className="mt-8">
              {renderSectionHeader("Admin")}
              {renderMenuItems(adminItems)}
            </div>
          ) : null}
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
