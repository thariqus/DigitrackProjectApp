import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { TaskFilters } from "../tasks/ui/task-filters";
import { TaskCardGrid } from "./ui/TaskCardGrid";

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("dashboard");
  const [description, setDescription] = useState(
    "Tasks that you have created and are responsible for."
  );

  useEffect(() => {
    switch (activeFilter) {
      case "dashboard":
        setDescription("Your dashboard overview.");
        break;
      case "my-tasks":
        setDescription("Tasks that you have created and are responsible for.");
        break;
      case "created-by-me":
        setDescription("Tasks that you have created.");
        break;
      default:
        setDescription("Your dashboard overview.");
    }
  }, [activeFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex items-center gap-2">
          {/* Default filters */}
          <TaskFilters
            activeFilter={activeFilter}
            onFilterChange={(value) => {
              if (value === "dashboard") {
                setActiveFilter("dashboard");
              } else {
                window.location.href = `/jh-digitrack/tasks?filter=${value}`;
              }
            }}
            onDescriptionChange={setDescription}
          />

          <div className="bg-rose-50 p-1 rounded-md flex items-center gap-1">
            <button
              className="text-sm font-medium text-gray-700 bg-rose-50 h-9 px-4 flex items-center justify-center rounded-md transition-colors"
              onClick={() => (window.location.href = "/jh-digitrack/idle-assets")}
            >
              Idle Assets
            </button>
          </div>
          <div className="bg-rose-50 p-1 rounded-md flex items-center gap-1">
            <button
              className="text-sm font-medium text-gray-700 bg-rose-50 h-9 px-4 flex items-center justify-center rounded-md transition-colors"
              onClick={() => (window.location.href = "/jh-digitrack/jrc-permission")}
            >
              JRC Explorer
            </button>
          </div>

          <div className="bg-rose-50 p-1 rounded-md flex items-center gap-1">
            <button
              className="text-sm font-medium text-gray-700 bg-rose-50 h-9 px-4 flex items-center justify-center rounded-md transition-colors"
              onClick={() => navigate("/jh-digitrack/customer-registration")}
            >
              Customer Registration
            </button>
          </div>

        </div>
      </div>

      {/* Dashboard cards */}
      {activeFilter === "dashboard" && <TaskCardGrid />}
    </div>
  );
};

export default Dashboard;
