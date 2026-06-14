import {
  isCloser,
  isManagement,
  isSalesManager,
  isSetter,
  type PermissionActor,
} from "@/lib/auth/permissions";
import { LEAD_STATUSES, type LeadStatus } from "./constants";

/** Setter-visible pipeline statuses (DB keys). Labels: Neu, Kontaktiert, Terminiert, Verloren */
export const SETTER_PIPELINE_STATUSES = [
  "new",
  "contacted",
  "scheduled",
  "lost",
] as const satisfies readonly LeadStatus[];

/** @alias SETTER_PIPELINE_STATUSES */
export const SETTER_STATUSES = SETTER_PIPELINE_STATUSES;

/** Closer-visible pipeline statuses. */
export const CLOSER_PIPELINE_STATUSES = [
  "scheduled",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const satisfies readonly LeadStatus[];

const SETTER_STATUS_SET = new Set<string>(SETTER_PIPELINE_STATUSES);
const CLOSER_STATUS_SET = new Set<string>(CLOSER_PIPELINE_STATUSES);
const CLOSER_ONLY_STATUSES = new Set<LeadStatus>(["qualified", "proposal", "won"]);

type LeadPipelineFields = {
  status: LeadStatus;
  closer_id: string | null;
};

export function isCloserOnlyLeadStatus(status: LeadStatus): boolean {
  return CLOSER_ONLY_STATUSES.has(status);
}

export function isScheduledHandoffStatus(status: LeadStatus): boolean {
  return status === "scheduled";
}

export function isSetterPipelineStatus(status: LeadStatus): boolean {
  return SETTER_STATUS_SET.has(status);
}

export function isCloserPipelineStatus(status: LeadStatus): boolean {
  return CLOSER_STATUS_SET.has(status);
}

export function isLeadInCloserPool(lead: LeadPipelineFields): boolean {
  return !lead.closer_id && lead.status === "scheduled";
}

export function canSetterChangeLeadStatus(
  profile: PermissionActor,
  lead: LeadPipelineFields,
): boolean {
  if (!isSetter(profile)) return false;
  if (lead.status === "won" || lead.status === "lost") return false;
  if (isCloserOnlyLeadStatus(lead.status)) return false;
  if (lead.status === "scheduled") {
    return true;
  }
  return isSetterPipelineStatus(lead.status);
}

export function canCloserChangeLeadStatus(
  profile: PermissionActor & Pick<{ id: string }, "id">,
  lead: LeadPipelineFields,
): boolean {
  if (!isCloser(profile)) return false;
  if (lead.status === "won" || lead.status === "lost") return false;
  if (lead.status === "scheduled" && !lead.closer_id) return false;
  if (lead.closer_id && lead.closer_id !== profile.id) return false;
  return isCloserPipelineStatus(lead.status);
}

export function canChangeLeadStatus(
  profile: PermissionActor & Pick<{ id: string }, "id">,
  lead: LeadPipelineFields,
): boolean {
  if (isManagement(profile) || isSalesManager(profile)) {
    return lead.status !== "won" && lead.status !== "lost";
  }
  if (isSetter(profile)) return canSetterChangeLeadStatus(profile, lead);
  if (isCloser(profile)) return canCloserChangeLeadStatus(profile, lead);
  return lead.status !== "won";
}

export function getVisibleLeadStatuses(profile: PermissionActor): LeadStatus[] {
  if (isManagement(profile) || isSalesManager(profile)) {
    return [...LEAD_STATUSES];
  }
  if (isSetter(profile)) {
    return [...SETTER_PIPELINE_STATUSES];
  }
  if (isCloser(profile)) {
    return [...CLOSER_PIPELINE_STATUSES];
  }
  return [...LEAD_STATUSES];
}

/** All closer dropdown options when the closer can edit the lead. */
export function getCloserLeadStatusOptions(
  profile: PermissionActor & Pick<{ id: string }, "id">,
  lead: LeadPipelineFields,
): LeadStatus[] {
  if (!isCloser(profile)) return [];
  if (lead.closer_id && lead.closer_id !== profile.id) {
    return [lead.status];
  }
  if (lead.status === "scheduled" && !lead.closer_id) {
    return ["scheduled"];
  }
  if (lead.status === "won") return ["won"];
  return [...CLOSER_PIPELINE_STATUSES];
}

/** All setter dropdown options — always Neu, Kontaktiert, Terminiert, Verloren when editable. */
export function getSetterLeadStatusOptions(
  profile: PermissionActor,
  lead: LeadPipelineFields,
): LeadStatus[] {
  if (!isSetter(profile)) return [];
  if (lead.status === "won") return ["won"];
  if (lead.status === "lost") return ["lost"];
  if (isCloserOnlyLeadStatus(lead.status)) return [lead.status];
  return [...SETTER_PIPELINE_STATUSES];
}

function canSetterTransition(from: LeadStatus, to: LeadStatus): boolean {
  if (from === "won") return false;
  if (isCloserOnlyLeadStatus(from)) return false;
  return SETTER_STATUS_SET.has(to);
}

function canCloserTransition(from: LeadStatus, to: LeadStatus): boolean {
  if (from === "won") return false;
  if (to === "new" || to === "contacted") return false;
  return CLOSER_STATUS_SET.has(to);
}

export function isAllowedLeadStatusTransition(
  profile: PermissionActor & Pick<{ id: string }, "id">,
  lead: LeadPipelineFields,
  nextStatus: LeadStatus,
): boolean {
  if (lead.status === nextStatus) return true;
  if (lead.status === "won") return false;

  if (isManagement(profile) || isSalesManager(profile)) {
    return true;
  }

  if (isSetter(profile)) {
    return canSetterTransition(lead.status, nextStatus);
  }

  if (isCloser(profile)) {
    if (lead.status === "scheduled" && !lead.closer_id) return false;
    if (lead.closer_id && lead.closer_id !== profile.id) return false;
    return canCloserTransition(lead.status, nextStatus);
  }

  return true;
}

export function getSelectableLeadStatuses(
  profile: PermissionActor & Pick<{ id: string }, "id">,
  lead: LeadPipelineFields,
): LeadStatus[] {
  if (lead.status === "won") {
    return ["won"];
  }

  if (isManagement(profile) || isSalesManager(profile)) {
    if (lead.status === "lost") return ["lost"];
    return [...LEAD_STATUSES];
  }

  if (isSetter(profile)) {
    return getSetterLeadStatusOptions(profile, lead);
  }

  if (isCloser(profile)) {
    return getCloserLeadStatusOptions(profile, lead);
  }

  return getVisibleLeadStatuses(profile);
}

export function assertRoleLeadStatusTransition(
  profile: PermissionActor & Pick<{ id: string }, "id">,
  lead: LeadPipelineFields,
  nextStatus: LeadStatus,
): void {
  if (!isAllowedLeadStatusTransition(profile, lead, nextStatus)) {
    throw new Error("Dieser Statuswechsel ist für deine Rolle nicht erlaubt");
  }
}
