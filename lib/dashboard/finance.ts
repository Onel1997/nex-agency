import { canAccessClient, canAccessFinanceRoutes } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { getClientById } from "@/lib/dashboard/clients";
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
import { resolveRetainerAmountCents } from "./billing-cycle";
import { resolveInvoiceType } from "./invoice-type";
import { computeExpenseStats, getAllExpenses } from "./expenses";
import {
  computeFreelancerInvoiceStats,
  getAllFreelancerInvoices,
} from "./freelancer-invoices";
import { getAllInvoices, getInvoiceStats } from "./invoices";
import { computeAllProfitBreakdowns } from "./profit";
import { calculateCommissionCents } from "./revenue";
import type {
  ClientRevenueRecord,
  FinanceStats,
  ProfitBreakdown,
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
  const monthlyRetainerCents = (row.monthly_retainer_cents as number | null) ?? null;
  const setupFeeCents = (row.setup_fee_cents as number | null) ?? null;
  const contractStartDate = (row.contract_start_date as string | null) ?? null;
  const autoInvoiceEnabled = Boolean(row.auto_invoice_enabled);
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
    monthly_retainer_cents: monthlyRetainerCents,
    setup_fee_cents: setupFeeCents,
    contract_start_date: contractStartDate,
    auto_invoice_enabled: autoInvoiceEnabled,
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
      monthlyRevenueCents,
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

function isActiveRetainerClient(client: ClientRevenueRecord): boolean {
  return (
    Boolean(client.contract_start_date) &&
    (client.monthly_revenue_cents ?? 0) > 0
  );
}

function computeRetainerInvoiceStats(invoices: Awaited<ReturnType<typeof getAllInvoices>>) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  let retainerRevenueThisMonthCents = 0;
  let openRetainerInvoicesCents = 0;
  let overdueRetainerInvoicesCents = 0;

  for (const invoice of invoices) {
    if (resolveInvoiceType(invoice) !== "retainer") continue;
    if (invoice.status === "cancelled") continue;

    const createdAt = new Date(invoice.created_at);
    if (createdAt.getFullYear() === year && createdAt.getMonth() === month) {
      retainerRevenueThisMonthCents += invoice.subtotal_cents;
    }

    if (invoice.status === "draft" || invoice.status === "sent") {
      openRetainerInvoicesCents += invoice.total_amount_cents;
    } else if (invoice.status === "overdue") {
      overdueRetainerInvoicesCents += invoice.total_amount_cents;
    }
  }

  return {
    retainerRevenueThisMonthCents,
    openRetainerInvoicesCents,
    overdueRetainerInvoicesCents,
  };
}

export async function getFinanceStats(): Promise<FinanceStats | null> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) return null;

  const [clients, invoiceStats, invoices, freelancerInvoices, expenses] =
    await Promise.all([
      getClientRevenueRecords(),
      getInvoiceStats(),
      getAllInvoices(),
      getAllFreelancerInvoices(),
      getAllExpenses(),
    ]);

  let totalRevenueCents = 0;
  let monthlyRecurringRevenueCents = 0;
  let activeRetainersCount = 0;
  let outstandingCommissionsCents = 0;
  let paidCommissionsCents = 0;
  let outstandingRetainerPaymentsCents = 0;

  for (const client of clients) {
    totalRevenueCents += client.total_revenue_cents ?? 0;
    outstandingRetainerPaymentsCents += client.outstanding_retainer_cents;
    outstandingCommissionsCents += client.commission_outstanding_cents;
    paidCommissionsCents += client.commission_paid_cents;

    if (isActiveRetainerClient(client)) {
      activeRetainersCount += 1;
      monthlyRecurringRevenueCents += resolveRetainerAmountCents(client);
    }
  }

  const retainerInvoiceStats = computeRetainerInvoiceStats(invoices);
  const freelancerInvoiceStats = computeFreelancerInvoiceStats(freelancerInvoices);
  const expenseStats = computeExpenseStats(expenses);

  const profitBreakdowns = computeAllProfitBreakdowns({
    clients,
    freelancerInvoices,
    expenses,
  });
  const totalProfit = profitBreakdowns.find((p) => p.period === "total");

  return {
    totalRevenueCents,
    monthlyRecurringRevenueCents,
    activeRetainersCount,
    ...retainerInvoiceStats,
    outstandingCommissionsCents,
    paidCommissionsCents,
    outstandingRetainerPaymentsCents,
    totalInvoicedCents: invoiceStats.totalInvoicedCents,
    openInvoicesCents: invoiceStats.openInvoicesCents,
    paidInvoicesCents: invoiceStats.paidInvoicesCents,
    overdueInvoicesCents: invoiceStats.overdueInvoicesCents,
    outstandingInvoiceAmountCents: invoiceStats.outstandingInvoiceAmountCents,
    ...freelancerInvoiceStats,
    monthlyExpensesCents: expenseStats.monthlyExpensesCents,
    yearlyExpensesCents: expenseStats.yearlyExpensesCents,
    agencyProfitCents: totalProfit?.profitCents ?? 0,
  };
}

export async function getProfitBreakdowns(): Promise<ProfitBreakdown[]> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) {
    throw new Error("Keine Berechtigung");
  }

  const [clients, freelancerInvoices, expenses] = await Promise.all([
    getClientRevenueRecords(),
    getAllFreelancerInvoices(),
    getAllExpenses(),
  ]);

  return computeAllProfitBreakdowns({
    clients,
    freelancerInvoices,
    expenses,
  });
}

async function buildClientRevenueRecords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientIds?: string[],
): Promise<ClientRevenueRecord[]> {
  const [{ rows }, payments, commissionPayouts] = await Promise.all([
    fetchClientRevenueRows(supabase),
    fetchRetainerPayments(supabase),
    fetchCommissionPayouts(supabase),
  ]);

  const filteredRows = clientIds
    ? rows.filter((row) => clientIds.includes(row.id as string))
    : rows;

  const paymentsByClient = groupPaymentsByClient(payments);
  const payoutsByClient = groupCommissionPayoutsByClient(commissionPayouts);

  return filteredRows.map((row) =>
    mapClientRevenueRow(
      row,
      paymentsByClient.get(row.id as string) ?? [],
      payoutsByClient.get(row.id as string) ?? [],
    ),
  );
}

export async function getClientRevenueRecords(): Promise<ClientRevenueRecord[]> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) {
    throw new Error("Keine Berechtigung");
  }

  const supabase = await createClient();
  return buildClientRevenueRecords(supabase);
}

export async function getClientRevenueRecordById(
  clientId: string,
): Promise<ClientRevenueRecord | null> {
  const profile = await getProfile();
  if (!profile) return null;

  const client = await getClientById(clientId);
  if (!client) return null;

  if (!canAccessClient(profile, client.responsible_member_id)) {
    return null;
  }

  const supabase = await createClient();
  const records = await buildClientRevenueRecords(supabase, [clientId]);
  return records[0] ?? null;
}
