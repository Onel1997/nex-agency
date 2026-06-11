import type { CommissionStatus } from "./constants";
import { calculateCommissionCents } from "./revenue";

export function computeCommissionOutstanding(
  totalCents: number,
  paidCents: number,
): number {
  return Math.max(0, totalCents - paidCents);
}

export function deriveCommissionStatus(
  totalCents: number,
  paidCents: number,
  outstandingCents: number,
): CommissionStatus {
  if (totalCents <= 0) return "none";
  if (outstandingCents <= 0 && paidCents > 0) return "paid";
  if (paidCents > 0 && outstandingCents > 0) return "outstanding";
  if (outstandingCents > 0) return "pending";
  return "none";
}

export function syncCommissionAmounts(input: {
  setupFeeCents: number | null;
  commissionRate: number | null;
  currentTotalCents: number;
  currentPaidCents: number;
}): {
  commission_total_cents: number;
  commission_paid_cents: number;
  commission_outstanding_cents: number;
  commission_status: CommissionStatus;
} {
  const earnedFromSetup = calculateCommissionCents(
    input.setupFeeCents,
    input.commissionRate,
  );
  const total = Math.max(input.currentTotalCents, earnedFromSetup);
  const paid = Math.min(Math.max(0, input.currentPaidCents), total);
  const outstanding = computeCommissionOutstanding(total, paid);

  return {
    commission_total_cents: total,
    commission_paid_cents: paid,
    commission_outstanding_cents: outstanding,
    commission_status: deriveCommissionStatus(total, paid, outstanding),
  };
}

export function applyCommissionPayout(input: {
  totalCents: number;
  paidCents: number;
  payoutCents: number;
}): {
  commission_paid_cents: number;
  commission_outstanding_cents: number;
  commission_status: CommissionStatus;
} {
  if (input.payoutCents <= 0) {
    throw new Error("Auszahlungsbetrag muss größer als 0 sein");
  }

  const outstanding = computeCommissionOutstanding(
    input.totalCents,
    input.paidCents,
  );
  if (input.payoutCents > outstanding) {
    throw new Error("Auszahlung übersteigt die offene Provision");
  }

  const paid = input.paidCents + input.payoutCents;
  const newOutstanding = computeCommissionOutstanding(input.totalCents, paid);

  return {
    commission_paid_cents: paid,
    commission_outstanding_cents: newOutstanding,
    commission_status: deriveCommissionStatus(
      input.totalCents,
      paid,
      newOutstanding,
    ),
  };
}

export function isCommissionSchemaMissingError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("does not exist") &&
    (normalized.includes("commission_total_cents") ||
      normalized.includes("commission_paid_cents") ||
      normalized.includes("commission_outstanding_cents"))
  );
}

export function isCommissionPayoutsSchemaMissingError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("does not exist") &&
    normalized.includes("client_commission_payouts")
  );
}
