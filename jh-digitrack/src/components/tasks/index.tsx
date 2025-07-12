import { useEffect, useState } from "react";
import { TaskFilters } from "./ui/task-filters";
import { TaskTable, TeamTasksTable } from "./task-table";

// Utility to get query parameter
function getFilterFromURL(): string {
  const urlParams = new URLSearchParams(window.location.search);
  const filter = urlParams.get("filter");
  const allowedFilters = ["my-tasks", "created-by-me", "team-tasks"];
  return allowedFilters.includes(filter ?? "") ? filter! : "my-tasks";
}

function Tasks() {
  const [activeFilter, setActiveFilter] = useState(getFilterFromURL());
  const [description, setDescription] = useState("");

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
