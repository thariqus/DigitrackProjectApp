import MeetingsTable from "./meetings-table";

function Meetings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Meetings / Grouped Tasks
        </h1>
        <p className="text-sm text-muted-foreground">
          Meetings / Grouped Tasks you and your team have created
        </p>
      </div>
      <MeetingsTable />
    </div>
  );
}

export default Meetings;
