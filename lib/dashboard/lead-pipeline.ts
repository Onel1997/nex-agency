import {
  isCloser,
  isManagement,
  isSalesManager,
  isSetter,
  type PermissionActor,
} from "@/lib/auth/permissions";
import { LEAD_STATUSES, type LeadStatus } from "./constants";

/** Setter-visible pipeline statuses. */
export const SETTER_PIPELINE_STATUSES = [
  "new",
  "contacted",
  "scheduled",
  "lost",
] as const satisfies readonly LeadStatus[];

/** Closer-visible pipeline statuses. */
export const CLOSER_PIPELINE_STATUSES = [
  "scheduled",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const satisfies readonly LeadStatus[];

const SETTER_FORWARD_ORDER = ["new", "contacted", "scheduled"] as const;
const CLOSER_FORWARD_ORDER = ["scheduled", "qualified", "proposal", "won"] as const;

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

function canSetterTransition(from: LeadStatus, to: LeadStatus): boolean {
  if (to === "lost") {
    return from !== "won" && from !== "lost" && isSetterPipelineStatus(from);
  }
  if (!SETTER_STATUS_SET.has(to) || to === "lost") return false;
  if (from === "scheduled") return to === "scheduled";
  if (isCloserOnlyLeadStatus(from) || from === "won") return false;

  const fromIndex = SETTER_FORWARD_ORDER.indexOf(
    from as (typeof SETTER_FORWARD_ORDER)[number],
  );
  const toIndex = SETTER_FORWARD_ORDER.indexOf(
    to as (typeof SETTER_FORWARD_ORDER)[number],
  );
  if (fromIndex === -1 || toIndex === -1) return false;
  return Math.abs(toIndex - fromIndex) <= 1;
}

function canCloserTransition(from: LeadStatus, to: LeadStatus): boolean {
  if (to === "new" || to === "contacted") return false;
  if (to === "lost") {
    return from !== "won" && from !== "lost" && CLOSER_STATUS_SET.has(from);
  }
  if (!CLOSER_STATUS_SET.has(to) || to === "lost") return false;
  if (from === "won" || from === "lost") return false;

  const fromIndex = CLOSER_FORWARD_ORDER.indexOf(
    from as (typeof CLOSER_FORWARD_ORDER)[number],
  );
  const toIndex = CLOSER_FORWARD_ORDER.indexOf(
    to as (typeof CLOSER_FORWARD_ORDER)[number],
  );
  if (fromIndex === -1 || toIndex === -1) return false;
  return toIndex >= fromIndex;
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

  const visible = getVisibleLeadStatuses(profile);

  if (isManagement(profile) || isSalesManager(profile)) {
    return LEAD_STATUSES.filter(
      (status) =>
        visible.includes(status) &&
        (status === lead.status ||
          isAllowedLeadStatusTransition(profile, lead, status)),
    );
  }

  if (isSetter(profile)) {
    if (isCloserOnlyLeadStatus(lead.status)) {
      return [lead.status];
    }
    return SETTER_PIPELINE_STATUSES.filter(
      (status) =>
        status === lead.status ||
        isAllowedLeadStatusTransition(profile, lead, status),
    );
  }

  if (isCloser(profile)) {
    if (lead.closer_id && lead.closer_id !== profile.id) {
      return [lead.status];
    }
    if (lead.status === "scheduled" && !lead.closer_id) {
      return ["scheduled"];
    }
    return CLOSER_PIPELINE_STATUSES.filter(
      (status) =>
        status === lead.status ||
        isAllowedLeadStatusTransition(profile, lead, status),
    );
  }

  return LEAD_STATUSES.filter((status) => status === lead.status || visible.includes(status));
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
