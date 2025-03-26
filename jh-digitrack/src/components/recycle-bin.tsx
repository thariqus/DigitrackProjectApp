import { TaskTable } from "./tasks/task-table";

function RecycleBin() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recycle Bin</h1>
        <p className="text-sm text-muted-foreground">
          Here is the list of all tasks that you have deleted.
        </p>
      </div>
      <TaskTable
        activeFilter={"deleted-tasks"}
        hideFilters
        hideSearchBar
        hideCreateTask
      />
    </div>
  );
}

export default RecycleBin;
