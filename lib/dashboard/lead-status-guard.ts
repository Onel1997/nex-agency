import type { LeadStatus } from "./constants";

/**
 * Lead lifecycle status must never be downgraded after "won".
 * Contract, invoice, and commission workflows must not change leads.status.
 */
export function preserveLeadStatusForUpdate(
  currentStatus: LeadStatus,
  requestedStatus: LeadStatus,
): LeadStatus {
  if (currentStatus === "won") {
    return "won";
  }
  return requestedStatus;
}

export function assertLeadStatusTransition(
  currentStatus: LeadStatus,
  nextStatus: LeadStatus,
): void {
  if (currentStatus === "won" && nextStatus !== "won") {
    throw new Error(
      "Der Lead-Status „Gewonnen“ kann nicht mehr geändert werden.",
    );
  }
}
