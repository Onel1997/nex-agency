import type { CommissionEntryStatus } from "./commission-constants";
import { detectSalesDealAttributionType } from "./sales-attribution";
import type { CommissionEntryRecord } from "./types";

export type RoleCommissionDisplayStatus = "open" | "ready" | "paid" | null;

export const ROLE_COMMISSION_STATUS_LABELS: Record<
  Exclude<RoleCommissionDisplayStatus, null>,
  string
> = {
  open: "Offen",
  ready: "Bereit zur Auszahlung",
  paid: "Bezahlt",
};

export const ROLE_COMMISSION_STATUS_ICONS: Record<
  Exclude<RoleCommissionDisplayStatus, null>,
  string
> = {
  open: "🟠",
  ready: "🟡",
  paid: "✅",
};

export function resolveRoleCommissionDisplayStatus(
  entryStatus: CommissionEntryStatus | null | undefined,
  commissionCents: number,
  rolePaid = false,
): RoleCommissionDisplayStatus {
  if (commissionCents <= 0 || !entryStatus) return null;
  if (entryStatus === "cancelled") return null;
  if (rolePaid || entryStatus === "paid") return "paid";
  if (entryStatus === "approved") return "ready";
  if (entryStatus === "pending") return "open";
  return null;
}

export function formatRoleCommissionStatusLabel(
  role: "setter" | "closer",
  displayStatus: RoleCommissionDisplayStatus,
): string | null {
  if (!displayStatus) return null;

  const roleLabel = role === "setter" ? "Setter" : "Closer";
  if (displayStatus === "paid") {
    return `${ROLE_COMMISSION_STATUS_ICONS.paid} ${roleLabel}-Provision bezahlt`;
  }
  if (displayStatus === "ready") {
    return `${ROLE_COMMISSION_STATUS_ICONS.ready} ${ROLE_COMMISSION_STATUS_LABELS.ready}`;
  }
  return `${ROLE_COMMISSION_STATUS_ICONS.open} ${ROLE_COMMISSION_STATUS_LABELS.open}`;
}

export function commissionEntryStatusToDisplayStatus(
  status: CommissionEntryStatus,
): RoleCommissionDisplayStatus | null {
  if (status === "cancelled") return null;
  if (status === "paid") return "paid";
  if (status === "approved") return "ready";
  if (status === "pending") return "open";
  return null;
}

export function formatCommissionEntryStatusLabel(
  status: CommissionEntryStatus,
): string {
  const displayStatus = commissionEntryStatusToDisplayStatus(status);
  if (!displayStatus) {
    return status === "cancelled" ? "Storniert" : "—";
  }
  return `${ROLE_COMMISSION_STATUS_ICONS[displayStatus]} ${ROLE_COMMISSION_STATUS_LABELS[displayStatus]}`;
}

export function buildCommissionEntryFromClientRevenue(input: {
  commissionEntryId: string | null;
  clientId: string;
  companyName: string;
  setterId: string | null;
  setterName: string | null;
  closerId: string | null;
  closerName: string | null;
  projectValueCents: number;
  setterRate: number;
  closerRate: number;
  setterCommissionCents: number;
  closerCommissionCents: number;
  commissionEntryStatus: CommissionEntryStatus | null;
  dealType?: import("./sales-attribution").SalesDealAttributionType | null;
}): CommissionEntryRecord | null {
  if (!input.commissionEntryId) return null;

  return {
    id: input.commissionEntryId,
    client_id: input.clientId,
    client_name: input.companyName,
    setter_id: input.setterId,
    setter_name: input.setterName,
    closer_id: input.closerId,
    closer_name: input.closerName,
    project_value_cents: input.projectValueCents,
    setter_rate: input.setterRate,
    closer_rate: input.closerRate,
    setter_commission_cents: input.setterCommissionCents,
    closer_commission_cents: input.closerCommissionCents,
    status: input.commissionEntryStatus ?? "pending",
    entry_type: "setup",
    deal_type:
      input.dealType ??
      detectSalesDealAttributionType({
        setterId: input.setterId,
        closerId: input.closerId,
      }),
    triggered_by_invoice_id: null,
    created_at: "",
    updated_at: "",
    paid_at: null,
  };
}
