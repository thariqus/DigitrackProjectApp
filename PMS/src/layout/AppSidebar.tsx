import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import JHICON from "../images/JH.png";
import jaleelholdings from "../images/jaleel holdings.png";

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
  },
  {
    icon: <IoSettingsOutline />,
    name: "Settings",
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered } = useSidebar();
  const location = useLocation();

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  const renderMenuItems = (items: NavItem[], hasLink = true) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav) => (
        <li key={nav.name}>
          {hasLink && nav.path ? (
            <Link
              to={nav.path}
              className={`menu-item group ${
                isActive(nav.path)
                  ? "menu-item-active"
                  : "menu-item-inactive"
              }`}
            >
              <span
                className={`menu-item-icon-size ${
                  isActive(nav.path)
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
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
    >
      <div
        className={`py-8 flex ${
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
                width={150}
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

      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          {/* Master Section */}
          {renderSectionHeader("Master")}
          {renderMenuItems(masterItems)}

          {/* Manager Section */}
          <div className="mt-8">
            {renderSectionHeader("Manager")}
            {renderMenuItems(managerItems)}
          </div>

          {/* Self Section */}
          <div className="mt-8">
            {renderSectionHeader("Self")}
            {renderMenuItems(selfItems, false)}
          </div>

          {/* Admin Section */}
          <div className="mt-8">
            {renderSectionHeader("Admin")}
            {renderMenuItems(adminItems, false)}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
