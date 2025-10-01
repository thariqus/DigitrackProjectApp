import ScrapTable from "./scrapitem-table";

function Scrapitems() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Scrap Items
        </h1>
        <p className="text-sm text-muted-foreground">
          Scrap Items List
        </p>
      </div>
      <ScrapTable />
    </div>
  );
}

export default Scrapitems;