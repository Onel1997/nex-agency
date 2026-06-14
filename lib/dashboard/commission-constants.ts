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
