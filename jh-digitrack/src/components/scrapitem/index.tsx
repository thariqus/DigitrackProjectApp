import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ScrapTable from "./scrapitem-table";
import SearchScrapTable from "./search-table";
import { useHasIdleAssetRole } from "@/hooks/userrole";

function Scrapitems() {
  const { data: idleAssetAccess } = useHasIdleAssetRole();
  const canManageIdleAssets = !!idleAssetAccess?.message?.has_access;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Idle Assets</h1>
        <p className="text-sm text-muted-foreground">Idle Assets List</p>
      </div>

      {canManageIdleAssets ? (
        <Tabs defaultValue="my-assets">
          <TabsList>
            <TabsTrigger value="my-assets">My Assets</TabsTrigger>
            <TabsTrigger value="search-assets">Search Idle Assets</TabsTrigger>
          </TabsList>

          <TabsContent value="my-assets" className="mt-4">
            <ScrapTable />
          </TabsContent>

          <TabsContent value="search-assets" className="mt-4">
            <SearchScrapTable />
          </TabsContent>
        </Tabs>
      ) : (
        <SearchScrapTable />
      )}
    </div>
  );
}

export default Scrapitems;
