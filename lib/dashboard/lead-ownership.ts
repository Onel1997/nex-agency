import {
  isCloser,
  isManagement,
  isSalesManager,
  type PermissionActor,
} from "@/lib/auth/permissions";
import type { LeadStatus } from "./constants";
import {
  isLeadInCloserPool as isLeadInCloserPoolFromPipeline,
  isScheduledHandoffStatus,
} from "./lead-pipeline";

export { isLeadInCloserPool } from "./lead-pipeline";

/** @deprecated Use isScheduledHandoffStatus or isLeadInCloserPool */
export function isOpenLeadStatus(status: LeadStatus): boolean {
  return isScheduledHandoffStatus(status);
}

export function canClaimLead(
  profile: PermissionActor & Pick<{ id: string }, "id">,
  lead: { closer_id: string | null; status: LeadStatus },
): boolean {
  return isCloser(profile) && isLeadInCloserPoolFromPipeline(lead);
}

export function canCloserWorkLead(
  profile: PermissionActor & Pick<{ id: string }, "id">,
  lead: { closer_id: string | null },
): boolean {
  return isCloser(profile) && lead.closer_id === profile.id;
}

export function canMarkLeadWonForLead(
  profile: PermissionActor & Pick<{ id: string }, "id">,
  lead: { closer_id: string | null },
): boolean {
  if (isManagement(profile) || isSalesManager(profile)) return true;
  return canCloserWorkLead(profile, lead);
}

export function canConvertLeadForLead(
  profile: PermissionActor & Pick<{ id: string }, "id">,
  lead: { closer_id: string | null; status: LeadStatus },
): boolean {
  if (isManagement(profile) || isSalesManager(profile)) return true;
  return canCloserWorkLead(profile, lead) && lead.status === "won";
}
