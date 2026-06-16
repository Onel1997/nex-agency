export const COMMISSION_FREELANCER_INVOICE_STATUSES = [
  "draft",
  "issued",
  "completed",
] as const;

export type CommissionFreelancerInvoiceStatus =
  (typeof COMMISSION_FREELANCER_INVOICE_STATUSES)[number];

export const COMMISSION_FREELANCER_INVOICE_STATUS_LABELS: Record<
  CommissionFreelancerInvoiceStatus,
  string
> = {
  draft: "Entwurf",
  issued: "Ausgestellt",
  completed: "Abgeschlossen",
};

export const COMMISSION_PAYOUT_ROLES = ["setter", "closer"] as const;

export type CommissionPayoutRole = (typeof COMMISSION_PAYOUT_ROLES)[number];

export const COMMISSION_PAYOUT_ROLE_LABELS: Record<CommissionPayoutRole, string> = {
  setter: "Setter",
  closer: "Closer",
};

const GERMAN_MONTH_NAMES = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;

export function formatGermanMonthYear(month: number, year: number): string {
  const name = GERMAN_MONTH_NAMES[month - 1] ?? String(month);
  return `${name} ${year}`;
}
