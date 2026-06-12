import type { ClientFreelancerPayoutStatus } from "./constants";

export function calculateFreelancerPayoutCents(
  setupFeeCents: number | null,
  rate: number | null,
): number {
  const setup = setupFeeCents ?? 0;
  if (setup <= 0 || !rate || rate <= 0) return 0;
  return Math.round((setup * rate) / 100);
}

export function calculateAgencyShareCents(
  setupFeeCents: number | null,
  freelancerPayoutCents: number,
): number {
  const setup = setupFeeCents ?? 0;
  if (setup <= 0) return 0;
  return Math.max(0, setup - freelancerPayoutCents);
}

export function computeFreelancerOutstanding(
  totalCents: number,
  paidCents: number,
): number {
  return Math.max(0, totalCents - paidCents);
}

export function deriveFreelancerPayoutStatus(
  totalCents: number,
  paidCents: number,
  outstandingCents: number,
): ClientFreelancerPayoutStatus {
  if (totalCents <= 0) return "pending";
  if (outstandingCents <= 0 && paidCents > 0) return "paid";
  if (paidCents > 0 && outstandingCents > 0) return "partially_paid";
  if (totalCents > 0 && paidCents === 0) return "pending";
  return "pending";
}

export function resolveFreelancerPayoutFields(input: {
  freelancerPayoutCents: number;
  freelancerPaidCents: number;
}): {
  freelancer_payout_cents: number;
  freelancer_paid_cents: number;
  freelancer_outstanding_cents: number;
  freelancer_payout_status: ClientFreelancerPayoutStatus;
} {
  const total = Math.max(0, input.freelancerPayoutCents);
  const paid = Math.min(Math.max(0, input.freelancerPaidCents), total);
  const outstanding = computeFreelancerOutstanding(total, paid);

  return {
    freelancer_payout_cents: total,
    freelancer_paid_cents: paid,
    freelancer_outstanding_cents: outstanding,
    freelancer_payout_status: deriveFreelancerPayoutStatus(total, paid, outstanding),
  };
}

export function syncFreelancerPayoutAmounts(input: {
  setupFeeCents: number | null;
  freelancerCommissionRate: number | null;
  isProjectPaid: boolean;
  currentTotalCents: number;
  currentPaidCents: number;
}): {
  freelancer_payout_cents: number;
  freelancer_paid_cents: number;
  freelancer_outstanding_cents: number;
  freelancer_payout_status: ClientFreelancerPayoutStatus;
} {
  const earnedFromSetup = input.isProjectPaid
    ? calculateFreelancerPayoutCents(
        input.setupFeeCents,
        input.freelancerCommissionRate,
      )
    : 0;
  const total = Math.max(input.currentTotalCents, earnedFromSetup);
  const paid = Math.min(Math.max(0, input.currentPaidCents), total);

  return resolveFreelancerPayoutFields({
    freelancerPayoutCents: total,
    freelancerPaidCents: paid,
  });
}

export function applyFreelancerPayout(input: {
  totalCents: number;
  paidCents: number;
  payoutCents: number;
}): {
  freelancer_paid_cents: number;
  freelancer_outstanding_cents: number;
  freelancer_payout_status: ClientFreelancerPayoutStatus;
} {
  if (input.payoutCents <= 0) {
    throw new Error("Auszahlungsbetrag muss größer als 0 sein");
  }

  const outstanding = computeFreelancerOutstanding(
    input.totalCents,
    input.paidCents,
  );
  if (input.payoutCents > outstanding) {
    throw new Error("Auszahlung übersteigt die offene Freelancer-Auszahlung");
  }

  const paid = input.paidCents + input.payoutCents;
  const resolved = resolveFreelancerPayoutFields({
    freelancerPayoutCents: input.totalCents,
    freelancerPaidCents: paid,
  });

  return {
    freelancer_paid_cents: resolved.freelancer_paid_cents,
    freelancer_outstanding_cents: resolved.freelancer_outstanding_cents,
    freelancer_payout_status: resolved.freelancer_payout_status,
  };
}

export function isClientFreelancerSchemaMissingError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("does not exist") &&
    (normalized.includes("assigned_freelancer_id") ||
      normalized.includes("freelancer_payout_cents") ||
      normalized.includes("freelancer_paid_cents") ||
      normalized.includes("freelancer_outstanding_cents") ||
      normalized.includes("freelancer_payout_status"))
  );
}

export function isClientFreelancerPayoutsSchemaMissingError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("does not exist") &&
    normalized.includes("client_freelancer_payouts")
  );
}

export function isClientSetupInvoicePaid(
  invoices: Array<{
    status: string;
    invoice_type?: string | null;
    billing_period_year?: number | null;
    billing_period_month?: number | null;
  }>,
): boolean {
  const setupInvoices = invoices.filter((invoice) => {
    if (invoice.status === "cancelled") return false;
    if (invoice.invoice_type === "setup") return true;
    if (invoice.invoice_type) return false;
    return (
      invoice.billing_period_year == null && invoice.billing_period_month == null
    );
  });

  if (setupInvoices.length === 0) return false;

  return setupInvoices.some((invoice) => invoice.status === "paid");
}
