import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useCurrentJhUser } from '@/hooks/auth';
import { useDocs } from '@/hooks/doc';
import { useDelegationPanel } from '@/context/DelegationPanelContext';
import { useDelegations, useCreateDelegation, useRevokeDelegation } from '@/components/PropertyAutomation/hooks/useDelegation';
import { CreateDelegationDialog } from '@/components/PropertyAutomation/ui/CreateDelegationDialog';
import { toast } from 'sonner';

interface DelegationRecord {
  name: string;
  delegator: string;
  delegator_name?: string | null;
  delegate: string;
  delegate_name?: string | null;
  delegation_type: "Temporary" | "Permanent" | "Ad-Hoc";
  from_date?: string | null;
  to_date?: string | null;
  status: "Active" | "Expired" | "Revoked";
}

const DelegationSheet: React.FC = () => {
  const { open, setOpen } = useDelegationPanel();
  const { data: delegations = [], isLoading: delegationsLoading } = useDelegations();
  
  console.log("delegations", delegations);
  const { data: currentUser } = useCurrentJhUser();
  const { data: usersData = [], isLoading: usersLoading } = useDocs({
    doctype: "User",
    fields: ["name", "full_name", "email"],
    limit: 500,
  });
  const revokeMutation = useRevokeDelegation();
  const createMutation = useCreateDelegation();

  const currentUserId = currentUser?.email;
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  console.log("currentUserId", currentUserId);

  useEffect(() => {
  if (open) {
    document.body.style.pointerEvents = "auto";
  } else {
    document.body.style.pointerEvents = "";
  }

  return () => {
    document.body.style.pointerEvents = "";
  };
}, [open]);

  const normalize = (val?: string) => val?.trim().toLowerCase();

const activeOutgoing = delegations.filter(
  (d) =>
    normalize(d.delegator) === normalize(currentUserId) &&
    normalize(d.status) === "active"
);

const activeIncoming = delegations.filter(
  (d) =>
    normalize(d.delegate) === normalize(currentUserId) &&
    normalize(d.status) === "active"
);
  console.log(activeIncoming,"incoming")
  console.log(activeOutgoing,"outgoing")

  const handleRevoke = (name: string) => {
    revokeMutation.mutate(name, {
      onSuccess: () => {
        toast.success('Delegation revoked successfully');
      },
    });
  };

  const handleCreate = (values: { delegate: string; delegation_type: string; from_date?: string; to_date?: string }) => {
    if (!currentUserId) return;

    createMutation.mutate({
      delegate: values.delegate,
      delegation_type: values.delegation_type as any,
      from_date: values.from_date,
      to_date: values.to_date,
    });
  };

  const formatDateRange = (delegation: DelegationRecord) => {
    if (delegation.delegation_type === 'Permanent') return 'Permanent';
    if (delegation.delegation_type === 'Ad-Hoc') return 'Until workflow completion';
    if (!delegation.from_date || !delegation.to_date) return 'Date not set';
    return `${new Date(delegation.from_date).toLocaleDateString()} to ${new Date(delegation.to_date).toLocaleDateString()}`;
  };

  if (delegationsLoading || usersLoading) {
    return null; // Or skeleton
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="sm:max-w-5xl px-5 pb-30">
        <SheetHeader className="text-2xl justify-between items-center px-0 py-2 flex">
          <div className='w-full flex justify-between items-center'>
              <SheetTitle>Manage Delegation</SheetTitle>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
          </div>
          
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)] pr-2">
          {/* My Delegation */}
          <div className="space-y-4 mb-8">
            <h2 className="font-semibold pb-2">My Delegation</h2>
            {activeOutgoing.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm mb-4">You don&apos;t have anyone acting on your behalf.</p>
                <Button onClick={() => setIsSetupOpen(true)} size="sm">Set Up Delegation</Button>
              </div>
            ) : (
              activeOutgoing.map((del) => (
                <div key={del.name} className="p-2 border rounded-lg bg-card flex justify-between items-center">
                  <div className='flex flex-col gap-1 '>
                    <div className="text-sm font-medium ">{del.delegate_name || del.delegate} acting on your behalf</div>
                    <p className="text-sm text-muted-foreground ">Type: {del.delegation_type}</p>
                    <p className="text-sm text-muted-foreground ">Valid: {formatDateRange(del)}</p>
                  </div>
                  <Button
                    
                    size="sm"
                    className="w-20 bg-red-400"
                    onClick={() => handleRevoke(del.name)}
                    disabled={revokeMutation.isPending}
                  >
                    {revokeMutation.isPending ? 'Ending...' : 'End Now'}
                  </Button>
                </div>
              ))
            )}
          </div>

          <Separator />

          {/* Delegated to Me */}
          <div>
            <h2 className="font-semibold pt-2 mb-4">Delegated to Me</h2>
            {activeIncoming.length === 0 ? (
              <div className="text-center text-sm py-12 text-muted-foreground">
                No one has delegated anything to you right now.
              </div>
            ) : (
              <div className="space-y-2">
                {activeIncoming.map((del) => (
                  <div key={del.name} className="flex gap-3 p-3 border rounded-md bg-card items-center">
                    <div className="flex-1">
                      <div className="font-medium">{del.delegator_name || del.delegator}</div>
                      <p className="text-sm text-muted-foreground">
                        {del.delegation_type} • {formatDateRange(del)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <CreateDelegationDialog 
          open={isSetupOpen} 
          onOpenChange={setIsSetupOpen}
          usersData={usersData}
          currentUserId={currentUserId}
          isUsersLoading={usersLoading}
          onCreate={handleCreate}
        />
      </SheetContent>
    </Sheet>
  );
};

export default DelegationSheet;

