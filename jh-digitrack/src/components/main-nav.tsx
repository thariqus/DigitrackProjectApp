import { cn } from "@/lib/utils";
import { ListTodo, FolderKanban, Calendar, User } from "lucide-react";
import { Link, useLocation } from "react-router";
import JHLogo from "@/assets/digitrack-logo.png";

export function MainNav() {
  const { pathname } = useLocation();

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
          <Link to="projects" className={className("/projects")}>
            <FolderKanban className="h-5 w-5" />
            <span>Projects</span>
          </Link>
          <Link to="meetings" className={className("/meetings")}>
            <Calendar className="h-5 w-5" />
            <span>Meetings</span>
          </Link>
          <button className="ml-4" aria-label="User profile">
            <User className="h-8 w-8 rounded-full bg-gray-100 p-1" />
          </button>
        </nav>
      </div>
    </header>
  );
}
