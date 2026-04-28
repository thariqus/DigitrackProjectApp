import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useCurrentUser } from "@/hooks/auth";
import { useDocs } from "@/hooks/doc";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateDelegation, useDelegations } from "../hooks/useDelegation";
import { DelegationTabs } from "../ui/DelegationTabs";
import { CreateDelegationDialog } from "../ui/CreateDelegationDialog";

type UserOption = {
  name: string;
  full_name?: string;
  email?: string;
};

type TabValue = "outgoing" | "incoming";

function Delegations() {
  
  const [activeTab, setActiveTab] = useState<TabValue>("outgoing");
  const [currentPage, setCurrentPage] = useState(1);
  const [datasPerPage, setDatasPerPage] = useState(10);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleTabChange = (value: TabValue) => {
    setActiveTab(value);
    setCurrentPage(1);
  };

  const { data: currentUser, isLoading: isCurrentUserLoading } = useCurrentUser();
  const { data: usersData = [], isLoading: isUsersLoading } = useDocs<UserOption>({
    doctype: "User",
    fields: ["name", "full_name", "email"],
    limit: 500,
  });

  const currentUserId = typeof currentUser === "string"
    ? currentUser
    : currentUser?.name;

  const { data: delegationData = [], isLoading: isDelegationsLoading } = useDelegations();

  const outgoingDelegations = useMemo(
    () => delegationData.filter((d: any) => d.delegator === currentUserId),
    [delegationData, currentUserId]
  );

  const incomingDelegations = useMemo(
    () => delegationData.filter((d: any) => d.delegate === currentUserId),
    [delegationData, currentUserId]
  );

  const createDelegationMutation = useCreateDelegation({
    onClose: () => setIsCreateDialogOpen(false),
  });

  const handleCreate = (values: any) => {
    createDelegationMutation.mutate(values);
  };

  const isPageLoading = isCurrentUserLoading || isDelegationsLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Active Delegations</h1>
          <p className="text-sm text-muted-foreground">
            Shows current active delegations for approvals you delegated and approvals delegated to you.
          </p>
        </div>

        <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Delegation
        </Button>
      </div>

      <DelegationTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        outgoingDelegations={outgoingDelegations}
        incomingDelegations={incomingDelegations}
        isLoading={isPageLoading}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        datasPerPage={datasPerPage}
        setDatasPerPage={setDatasPerPage}
      />

      <CreateDelegationDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        usersData={usersData}
        currentUserId={currentUserId}
        isUsersLoading={isUsersLoading}
        onCreate={handleCreate}
      />
    </div>
  );
}

export default Delegations;

