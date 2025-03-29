import AuditsTable from "./audits-table";

function Tasks() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audits</h1>
        <p className="text-sm text-muted-foreground">
          Internal audits you and your team have created
        </p>
      </div>
      <AuditsTable />
    </div>
  );
}

export default Tasks;
