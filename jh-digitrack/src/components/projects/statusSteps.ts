import { ProjectItemAuditEntry } from "@/hooks/project-items";

export type StatusStep = { status: string; at: string };

/** Build the ordered status steps of one Item from the Project audit log. */
export function buildStatusSteps(entries: ProjectItemAuditEntry[], currentStatus: string, createdAt?: string): StatusStep[] {
  const changes = entries
    .filter((entry) => entry.event === "Item edited")
    .flatMap((entry) => entry.changes.filter((change) => change.field === "Status").map((change) => ({ ...change, at: entry.timestamp })))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const created = entries.find((entry) => entry.event === "Item created")?.timestamp || createdAt;
  const initialStatus = changes.length ? String(changes[0].from ?? currentStatus) : currentStatus;
  const steps: StatusStep[] = created ? [{ status: initialStatus, at: created }] : [];
  changes.forEach((change) => steps.push({ status: String(change.to ?? ""), at: change.at }));
  return steps;
}
