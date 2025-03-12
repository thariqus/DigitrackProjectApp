"use client";

import { useState, useEffect } from "react";
import { TaskFilters } from "./ui/task-filters";
import { TaskTable, TeamTasksTable } from "./task-table";

function Tasks() {
  const [activeFilter, setActiveFilter] = useState("my-tasks");
  const [description, setDescription] = useState(
    "Here is the list of all tasks assigned to you and created by you."
  );

  // Update the description when the filter changes
  useEffect(() => {
    if (activeFilter === "my-tasks") {
      setDescription("Tasks that you have created and are responsible for.");
    } else if (activeFilter === "created-by-me") {
      setDescription("Tasks that you have created.");
    } else if (activeFilter === "team-tasks") {
      setDescription("All tasks assigned to your team members.");
    }
  }, [activeFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <TaskFilters
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onDescriptionChange={setDescription}
      />
      {activeFilter === "team-tasks" ? (
        <TeamTasksTable />
      ) : (
        <TaskTable activeFilter={activeFilter} />
      )}
    </div>
  );
}

export default Tasks;
