import { Outlet } from "react-router";


export default function PropertyAutomation() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Property Automation</h1>
        <p className="text-sm text-muted-foreground">Smart property and renewal management</p>
      </div>
      <Outlet/>
    </div>
    
  );
}