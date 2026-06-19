import {
  CONTRACT_STATUS_LABELS,
  type ContractStatus,
} from "./contract-constants";

export type ContractLifecycleAction =
  | "send"
  | "sign"
  | "activate"
  | "terminate"
  | "archive";

export const CONTRACT_LIFECYCLE_ACTION_LABELS: Record<
  ContractLifecycleAction,
  string
> = {
  send: "Versenden",
  sign: "Als unterschrieben markieren",
  activate: "Vertrag aktivieren",
  terminate: "Vertrag kündigen",
  archive: "Archivieren",
};

export interface ContractDetailUiPermissions {
  lifecycle: ContractLifecycleAction[];
  canEdit: boolean;
  canDelete: boolean;
}

export const CONTRACT_LIFECYCLE_PLACEHOLDER_ACTIONS: readonly ContractLifecycleAction[] =
  ["send", "sign", "activate", "terminate", "archive"];

export const CONTRACT_LIFECYCLE_SHORT_LABELS: Record<
  ContractLifecycleAction,
  string
> = {
  send: "Versenden",
  sign: "Unterschreiben",
  activate: "Aktivieren",
  terminate: "Kündigen",
  archive: "Archivieren",
};

export function canDeleteContract(status: ContractStatus): boolean {
  return status === "draft" || status === "archived";
}

export function getContractDetailUiPermissions(
  status: ContractStatus,
): ContractDetailUiPermissions {
  return {
    lifecycle: getContractLifecycleActions(status),
    canEdit: status === "draft",
    canDelete: canDeleteContract(status),
  };
}

export const CONTRACT_STATUS_TIMELINE: Array<{
  status: ContractStatus;
  label: string;
  timestampKey:
    | "sent_at"
    | "signed_at"
    | "activated_at"
    | "terminated_at"
    | "archived_at"
    | null;
}> = [
  { status: "draft", label: "Entwurf", timestampKey: null },
  { status: "sent", label: "Versendet", timestampKey: "sent_at" },
  { status: "signed", label: "Unterschrieben", timestampKey: "signed_at" },
  { status: "active", label: "Aktiv", timestampKey: "activated_at" },
  { status: "terminated", label: "Gekündigt", timestampKey: "terminated_at" },
  { status: "archived", label: "Archiviert", timestampKey: "archived_at" },
];

export interface ContractLifecycleState {
  status: ContractStatus;
  signed_by_agency?: boolean | null;
  signed_by_partner?: boolean | null;
}

export interface ContractLifecycleUpdate {
  status: ContractStatus;
  sent_at?: string | null;
  signed_at?: string | null;
  activated_at?: string | null;
  terminated_at?: string | null;
  archived_at?: string | null;
  signed_by_agency?: boolean;
  signed_by_partner?: boolean;
  agency_signed_at?: string | null;
  partner_signed_at?: string | null;
}

export function isTeamContractRevenueActive(status: ContractStatus): boolean {
  return status === "active";
}

export function getContractLifecycleActions(
  status: ContractStatus,
): ContractLifecycleAction[] {
  switch (status) {
    case "draft":
      return ["send"];
    case "sent":
      return ["sign"];
    case "signed":
      return ["activate"];
    case "active":
      return ["terminate"];
    case "terminated":
    case "expired":
      return ["archive"];
    default:
      return [];
  }
}

export function canPerformContractLifecycleAction(
  state: ContractLifecycleState,
  action: ContractLifecycleAction,
): boolean {
  return getContractLifecycleActions(state.status).includes(action);
}

export function resolveStatusAfterSignatures(input: {
  signedByAgency: boolean;
  signedByPartner: boolean;
  currentStatus: ContractStatus;
}): ContractStatus {
  if (input.signedByAgency && input.signedByPartner) {
    return "signed";
  }
  return input.currentStatus === "signed" ? "sent" : input.currentStatus;
}

export function buildContractLifecycleUpdate(
  state: ContractLifecycleState,
  action: ContractLifecycleAction,
  now: string = new Date().toISOString(),
): ContractLifecycleUpdate {
  if (!canPerformContractLifecycleAction(state, action)) {
    throw new Error(
      `Aktion „${CONTRACT_LIFECYCLE_ACTION_LABELS[action]}“ ist im Status „${CONTRACT_STATUS_LABELS[state.status]}“ nicht möglich`,
    );
  }

  switch (action) {
    case "send":
      return { status: "sent", sent_at: now };
    case "sign":
      return {
        status: "signed",
        signed_at: now,
        signed_by_agency: true,
        signed_by_partner: true,
        agency_signed_at: now,
        partner_signed_at: now,
      };
    case "activate":
      return { status: "active", activated_at: now };
    case "terminate":
      return { status: "terminated", terminated_at: now };
    case "archive":
      return { status: "archived", archived_at: now };
    default:
      throw new Error("Unbekannte Vertragsaktion");
  }
}

export function getContractLifecycleActivityMessage(
  action: ContractLifecycleAction,
  contractNumber: string,
): string {
  switch (action) {
    case "send":
      return `Vertrag ${contractNumber} wurde versendet`;
    case "sign":
      return `Vertrag ${contractNumber} wurde unterschrieben`;
    case "activate":
      return `Vertrag ${contractNumber} wurde aktiviert`;
    case "terminate":
      return `Vertrag ${contractNumber} wurde gekündigt`;
    case "archive":
      return `Vertrag ${contractNumber} wurde archiviert`;
    default:
      return `Vertrag ${contractNumber} — Status geändert`;
  }
}

export function getContractLifecycleActivityAction(
  action: ContractLifecycleAction,
):
  | "contract_sent"
  | "contract_signed"
  | "contract_activated"
  | "contract_terminated"
  | "contract_archived" {
  switch (action) {
    case "send":
      return "contract_sent";
    case "sign":
      return "contract_signed";
    case "activate":
      return "contract_activated";
    case "terminate":
      return "contract_terminated";
    case "archive":
      return "contract_archived";
    default:
      return "contract_sent";
  }
}
