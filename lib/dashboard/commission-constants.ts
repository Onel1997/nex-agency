export const COMMISSION_ENTRY_STATUSES = [
  "pending",
  "approved",
  "paid",
  "cancelled",
] as const;

export type CommissionEntryStatus = (typeof COMMISSION_ENTRY_STATUSES)[number];

export const COMMISSION_ENTRY_STATUS_LABELS: Record<CommissionEntryStatus, string> = {
  pending: "Offen",
  approved: "Freigegeben",
  paid: "Ausbezahlt",
  cancelled: "Storniert",
};

export const COMMISSION_TRIGGERING_INVOICE_TYPES = ["setup", "manual"] as const;

export type CommissionTriggeringInvoiceType =
  (typeof COMMISSION_TRIGGERING_INVOICE_TYPES)[number];

export const COMMISSION_ENTRY_TYPES = ["setup", "retainer"] as const;

export type CommissionEntryType = (typeof COMMISSION_ENTRY_TYPES)[number];

export const COMMISSION_ENTRY_TYPE_LABELS: Record<CommissionEntryType, string> = {
  setup: "Setup",
  retainer: "Retainer",
};

export const DEFAULT_RETAINER_COMMISSION_RATE = 10;
export const DEFAULT_RETAINER_COMMISSION_MONTHS = 3;
