import { canAccessFinanceRoutes } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import type { CommissionStatus } from "@/lib/dashboard/constants";
import { createClient } from "@/lib/supabase/server";
import { syncCommissionAmounts } from "./commission";
import {
  fetchClientRevenueRows,
  fetchCommissionPayouts,
  fetchRetainerPayments,
  groupCommissionPayoutsByClient,
  groupPaymentsByClient,
} from "./retainer-data";
import {
  buildRetainerPeriodViews,
  buildRetainerStats,
  type RetainerPaymentRecord,
} from "./retainer";
import { calculateCommissionCents } from "./revenue";
import type {
  ClientRevenueRecord,
  CommissionPayoutRecord,
  FinanceStats,
} from "./types";

function formatMemberName(
  member: { full_name: string | null; email: string } | null | undefined,
): string | null {
  if (!member) return null;
  return member.full_name?.trim() || member.email.split("@")[0];
}

export { calculateCommissionCents, computeTotalRevenueCents } from "./revenue";

function resolveCommissionFields(
  row: Record<string, unknown>,
  commissionRate: number,
): {
  commission_total_cents: number;
  commission_paid_cents: number;
  commission_outstanding_cents: number;
} {
  if (row.commission_total_cents !== undefined) {
    return {
      commission_total_cents: (row.commission_total_cents as number) ?? 0,
      commission_paid_cents: (row.commission_paid_cents as number) ?? 0,
      commission_outstanding_cents:
        (row.commission_outstanding_cents as number) ?? 0,
    };
  }

  const setupFeeCents = (row.setup_fee_cents as number | null) ?? null;
  const synced = syncCommissionAmounts({
    setupFeeCents,
    commissionRate,
    currentTotalCents: 0,
    currentPaidCents: 0,
  });

  return {
    commission_total_cents: synced.commission_total_cents,
    commission_paid_cents: synced.commission_paid_cents,
    commission_outstanding_cents: synced.commission_outstanding_cents,
  };
}

function mapClientRevenueRow(
  row: Record<string, unknown>,
  payments: RetainerPaymentRecord[],
  commissionPayouts: import("./types").CommissionPayoutRecord[],
): ClientRevenueRecord {
  const responsibleMember = Array.isArray(row.responsible_member)
    ? row.responsible_member[0]
    : row.responsible_member;

  const member = responsibleMember as {
    full_name: string | null;
    email: string;
    commission_rate: number;
  } | null;

  const commissionRate = member?.commission_rate ?? 0;
  const monthlyRevenueCents = (row.monthly_revenue_cents as number | null) ?? null;
  const setupFeeCents = (row.setup_fee_cents as number | null) ?? null;
  const contractStartDate = (row.contract_start_date as string | null) ?? null;
  const commissionFields = resolveCommissionFields(row, commissionRate);
  const retainerStats = buildRetainerStats({
    contract_start_date: contractStartDate,
    setup_fee_cents: setupFeeCents,
    monthly_revenue_cents: monthlyRevenueCents,
    payments,
  });
  const totalRevenue = retainerStats.total_revenue_cents;

  return {
    id: row.id as string,
    company_name: row.company_name as string,
    responsible_member_id: (row.responsible_member_id as string | null) ?? null,
    responsible_member_name: formatMemberName(member),
    monthly_revenue_cents: monthlyRevenueCents,
    setup_fee_cents: setupFeeCents,
    contract_start_date: contractStartDate,
    total_revenue_cents: totalRevenue > 0 ? totalRevenue : null,
    setup_revenue_cents: retainerStats.setup_revenue_cents,
    retainer_revenue_cents: retainerStats.retainer_revenue_cents,
    months_active: retainerStats.months_active,
    months_paid: retainerStats.months_paid,
    months_open: retainerStats.months_open,
    next_payment_due: retainerStats.next_payment_due,
    outstanding_retainer_cents: retainerStats.outstanding_retainer_cents,
    retainer_periods: buildRetainerPeriodViews(
      contractStartDate,
      payments,
    ),
    commission_status: row.commission_status as CommissionStatus,
    commission_rate: commissionRate,
    commission_cents: commissionFields.commission_total_cents,
    commission_total_cents: commissionFields.commission_total_cents,
    commission_paid_cents: commissionFields.commission_paid_cents,
    commission_outstanding_cents: commissionFields.commission_outstanding_cents,
    commission_payouts: commissionPayouts,
    currency: (row.currency as string) ?? "EUR",
  };
}

export async function getFinanceStats(): Promise<FinanceStats | null> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) return null;

  const clients = await getClientRevenueRecords();

  let totalRevenueCents = 0;
  let monthlyRecurringRevenueCents = 0;
  let outstandingCommissionsCents = 0;
  let paidCommissionsCents = 0;
  let outstandingRetainerPaymentsCents = 0;

  for (const client of clients) {
    totalRevenueCents += client.total_revenue_cents ?? 0;
    monthlyRecurringRevenueCents += client.monthly_revenue_cents ?? 0;
    outstandingRetainerPaymentsCents += client.outstanding_retainer_cents;

    outstandingCommissionsCents += client.commission_outstanding_cents;
    paidCommissionsCents += client.commission_paid_cents;
  }

  return {
    totalRevenueCents,
    monthlyRecurringRevenueCents,
    outstandingCommissionsCents,
    paidCommissionsCents,
    outstandingRetainerPaymentsCents,
  };
}

export async function getClientRevenueRecords(): Promise<ClientRevenueRecord[]> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) {
    throw new Error("Keine Berechtigung");
  }

  const supabase = await createClient();
  const [{ rows }, payments, commissionPayouts] = await Promise.all([
    fetchClientRevenueRows(supabase),
    fetchRetainerPayments(supabase),
    fetchCommissionPayouts(supabase),
  ]);

  const paymentsByClient = groupPaymentsByClient(payments);
  const payoutsByClient = groupCommissionPayoutsByClient(commissionPayouts);

  return rows.map((row) =>
    mapClientRevenueRow(
      row,
      paymentsByClient.get(row.id as string) ?? [],
      payoutsByClient.get(row.id as string) ?? [],
    ),
  );
}
