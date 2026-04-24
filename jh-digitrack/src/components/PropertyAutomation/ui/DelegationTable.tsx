import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { PaginationControls } from "./PaginationControls";

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

type DelegationTableProps = {
  delegations: DelegationRecord[];
  isLoading: boolean;
  tab: TabValue;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  datasPerPage: number;
  setDatasPerPage: (value: number) => void;
};

const formatDate = (date?: string | null) => {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

const formatDateRange = (delegation: DelegationRecord) => {
  if (delegation.delegation_type === "Permanent") {
    return "No end date";
  }

  if (delegation.delegation_type === "Ad-Hoc") {
    return "Until workflow completion";
  }

  if (!delegation.from_date || !delegation.to_date) {
    return "Not set";
  }

  return `${formatDate(delegation.from_date)} to ${formatDate(delegation.to_date)}`;
};

export function DelegationTable({
  delegations,
  isLoading,
  tab,
  currentPage,
  setCurrentPage,
  datasPerPage,
  setDatasPerPage,
}: DelegationTableProps) {

  if (isLoading) {
    return (
      <div className="rounded-md border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
        Loading delegations...
      </div>
    );
  }

  if (!delegations.length) {
    return (
      <div className="rounded-md border border-dashed px-6 py-10 text-center">
        <h3 className="text-base font-medium">
          No {tab === "outgoing" ? "outgoing" : "incoming"} delegations
        </h3>
        <p className="text-sm text-muted-foreground">
          {tab === "outgoing"
            ? "You do not have any active delegations created yet."
            : "No active delegations have been assigned to you."}
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(delegations.length / datasPerPage);
  const start = (currentPage - 1) * datasPerPage;
  const paginatedDelegations = delegations.slice(start, start + datasPerPage);

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>{tab === "outgoing" ? "Delegated To" : "Delegated By"}</TableHead>              
              <TableHead>Type</TableHead>
              <TableHead>Date Range</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedDelegations.map((delegation, index) => {
              const counterpartName =
                tab === "outgoing"
                  ? delegation.delegate_name || delegation.delegate
                  : delegation.delegator_name || delegation.delegator;

              return (
                <TableRow key={delegation.name} className="border-b ">
                  <TableCell>{start + index + 1}</TableCell>
                  <TableCell>
                    <div className="font-medium">{counterpartName}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={delegation.delegation_type === "Permanent" ? "secondary" : "outline"}>
                      {delegation.delegation_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateRange(delegation)}</TableCell>
                  <TableCell>
                    <Badge>{delegation.status}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
         <PaginationControls
            datasPerPage={datasPerPage}
            setDatasPerPage={setDatasPerPage}
            totalPages={totalPages}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
      </div>
     
    </div>
  );
}

