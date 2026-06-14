import type { InvoiceType } from "./constants";
import type { CommissionEntryStatus } from "./commission-constants";
import { COMMISSION_TRIGGERING_INVOICE_TYPES } from "./commission-constants";

export function calculateRoleCommissionCents(
  projectValueCents: number,
  rate: number,
): number {
  if (projectValueCents <= 0 || rate <= 0) return 0;
  return Math.round((projectValueCents * rate) / 100);
}

export function calculateSetterCloserCommissions(input: {
  projectValueCents: number;
  setterRate: number;
  closerRate: number;
  hasSetter: boolean;
  hasCloser: boolean;
}): {
  setter_commission_cents: number;
  closer_commission_cents: number;
} {
  return {
    setter_commission_cents: input.hasSetter
      ? calculateRoleCommissionCents(input.projectValueCents, input.setterRate)
      : 0,
    closer_commission_cents: input.hasCloser
      ? calculateRoleCommissionCents(input.projectValueCents, input.closerRate)
      : 0,
  };
}

export function isCommissionTriggeringInvoiceType(
  invoiceType: InvoiceType | null | undefined,
): boolean {
  if (!invoiceType) return false;
  return (COMMISSION_TRIGGERING_INVOICE_TYPES as readonly string[]).includes(
    invoiceType,
  );
}

export function shouldCreateCommissionEntry(input: {
  invoiceStatus: string;
  invoiceType: InvoiceType | null;
  existingEntryForInvoice: boolean;
  setterId: string | null;
  closerId: string | null;
  setterCommissionCents: number;
  closerCommissionCents: number;
}): boolean {
  if (input.invoiceStatus !== "paid") return false;
  if (!isCommissionTriggeringInvoiceType(input.invoiceType)) return false;
  if (input.existingEntryForInvoice) return false;
  if (!input.setterId && !input.closerId) return false;
  return input.setterCommissionCents > 0 || input.closerCommissionCents > 0;
}

export function canApproveCommissionEntry(status: CommissionEntryStatus): boolean {
  return status === "pending";
}

export function canPayCommissionEntry(status: CommissionEntryStatus): boolean {
  return status === "approved";
}

export function nextCommissionEntryStatus(
  current: CommissionEntryStatus,
  action: "approve" | "pay" | "cancel",
): CommissionEntryStatus | null {
  if (action === "approve" && current === "pending") return "approved";
  if (action === "pay" && current === "approved") return "paid";
  if (action === "cancel" && (current === "pending" || current === "approved")) {
    return "cancelled";
  }
  return null;
}

export function sumMemberCommissionEarned(
  entries: {
    setter_id: string | null;
    closer_id: string | null;
    setter_commission_cents: number;
    closer_commission_cents: number;
    status: CommissionEntryStatus;
  }[],
  profileId: string,
): number {
  return entries.reduce((sum, entry) => {
    if (entry.status === "cancelled") return sum;
    if (entry.setter_id === profileId) sum += entry.setter_commission_cents;
    if (entry.closer_id === profileId) sum += entry.closer_commission_cents;
    return sum;
  }, 0);
}

export function sumMemberCommissionOpen(
  entries: {
    setter_id: string | null;
    closer_id: string | null;
    setter_commission_cents: number;
    closer_commission_cents: number;
    status: CommissionEntryStatus;
  }[],
  profileId: string,
): number {
  return entries.reduce((sum, entry) => {
    if (entry.status !== "pending" && entry.status !== "approved") return sum;
    if (entry.setter_id === profileId) sum += entry.setter_commission_cents;
    if (entry.closer_id === profileId) sum += entry.closer_commission_cents;
    return sum;
  }, 0);
}
