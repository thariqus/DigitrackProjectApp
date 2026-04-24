import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DelegationTable } from "./DelegationTable";

type DelegationRecord = {
  name: string;
  delegator: string;
  delegator_name?: string | null;
  delegate: string;
  delegate_name?: string | null;
  delegation_type: "Temporary" | "Permanent" | "Ad-Hoc";
  from_date?: string | null;
  to_date?: string | null;
  status: "Active" | "Expired" | "Revoked";
};

type TabValue = "outgoing" | "incoming";

type DelegationTabsProps = {
  activeTab: TabValue;
  onTabChange: (value: TabValue) => void;
  outgoingDelegations: DelegationRecord[];
  incomingDelegations: DelegationRecord[];
  isLoading: boolean;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  datasPerPage: number;
  setDatasPerPage: (value: number) => void;
};

export function DelegationTabs({
  activeTab,
  onTabChange,
  outgoingDelegations,
  incomingDelegations,
  isLoading,
  currentPage,
  setCurrentPage,
  datasPerPage,
  setDatasPerPage,
}: DelegationTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as TabValue)} className="space-y-4">
      <TabsList>
        <TabsTrigger title="I delegated" value="outgoing">
          Outgoing
        </TabsTrigger>
        <TabsTrigger title="Delegated to me" value="incoming">
          Incoming
        </TabsTrigger>
      </TabsList>

      <TabsContent value="outgoing" className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Loading outgoing delegations..."
            : `${outgoingDelegations.length} active outgoing delegation${outgoingDelegations.length === 1 ? "" : "s"}`}
        </p>
        <DelegationTable
          delegations={outgoingDelegations}
          isLoading={isLoading}
          tab="outgoing"
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          datasPerPage={datasPerPage}
          setDatasPerPage={setDatasPerPage}
        />
      </TabsContent>

      <TabsContent value="incoming" className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Loading incoming delegations..."
            : `${incomingDelegations.length} active incoming delegation${incomingDelegations.length === 1 ? "" : "s"}`}
        </p>
        <DelegationTable
          delegations={incomingDelegations}
          isLoading={isLoading}
          tab="incoming"
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          datasPerPage={datasPerPage}
          setDatasPerPage={setDatasPerPage}
        />
      </TabsContent>
    </Tabs>
  );
}

