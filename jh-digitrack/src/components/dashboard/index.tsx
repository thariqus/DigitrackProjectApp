import React, { useEffect, useState } from "react";
import { TaskFilters } from "../tasks/ui/task-filters";
import { TaskCardGrid } from "./ui/TaskCardGrid";

const Dashboard = () => {
  const [activeFilter, setActiveFilter] = useState("dashboard");
  const [description, setDescription] = useState("Tasks that you have created and are responsible for.");
  const [loading, setLoading] = useState(true);

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
    }
  }, [activeFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
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

      </div>

      {activeFilter === "dashboard" && (
        <>
          <TaskCardGrid />
        </>
      )}
    </div>
  );
};

export default Dashboard;
