import { canAccessClient, canAccessFinanceRoutes } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { fetchPaidRetainerInvoiceStatsByClient } from "@/lib/dashboard/client-revenue-sync";
import { getClientById } from "@/lib/dashboard/clients";
import type { CommissionStatus } from "@/lib/dashboard/constants";
import { createClient } from "@/lib/supabase/server";
import {
  calculateAgencyShareCents,
  calculateFreelancerPayoutCents,
  isClientSetupInvoicePaid,
  resolveFreelancerPayoutFields,
} from "./client-freelancer-payout";
import { resolveClientCommissionPayoutStatus } from "./client-commission-status";
import {
  buildSetterAttributionDebug,
  resolveClientSetterId,
} from "./lead-attribution";
import {
  fetchCommissionEntries,
  fetchCommissionPayoutProfileIds,
  groupLatestCommissionEntryByClient,
  groupPaidProfilesByClient,
} from "./commission-entries-data";
import {
  buildResolvedSalesAttribution,
} from "./sales-attribution";
import {
  fetchClientFreelancerPayouts,
  fetchClientRevenueRows,
  fetchCommissionPayouts,
  fetchRetainerInvoices,
  groupClientFreelancerPayoutsByClient,
  groupCommissionPayoutsByClient,
  groupRetainerInvoicesByClient,
} from "./retainer-data";
import {
  buildRetainerPeriodViews,
  buildRetainerStats,
  type RetainerPeriodInvoiceRef,
} from "./retainer";
import { resolveRetainerAmountCents } from "./billing-cycle";
import { resolveContractStatus } from "./contract-status";
import { resolveInvoiceType } from "./invoice-type";
import { computeExpenseStats, getAllExpenses } from "./expenses";
import {
  computeFreelancerInvoiceStats,
  getAllFreelancerInvoices,
} from "./freelancer-invoices";
import { getAllInvoices, getInvoiceStats } from "./invoices";
import { computeAllProfitBreakdowns } from "./profit";
import { computeEntryCommissionTotals } from "./sales-metrics";
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

type AttributionProfileRow = {
  id?: string;
  full_name: string | null;
  email: string;
  setter_commission_rate?: number;
  closer_commission_rate?: number;
  agency_role?: string | null;
};

function readNestedProfile(value: unknown): AttributionProfileRow | null {
  const profile = Array.isArray(value) ? value[0] : value;
  if (!profile || typeof profile !== "object") return null;
  return profile as AttributionProfileRow;
}

function resolveAttributionProfile(
  profileId: string | null,
  ...candidates: unknown[]
): AttributionProfileRow | null {
  if (!profileId) return null;

  for (const candidate of candidates) {
    const profile = readNestedProfile(candidate);
    if (!profile) continue;
    if (!profile.id || profile.id === profileId) {
      return { ...profile, id: profileId };
    }
  }

  return { id: profileId, full_name: null, email: "", agency_role: null };
}

export { calculateCommissionCents, computeTotalRevenueCents } from "./revenue";

function mapClientRevenueRow(
  row: Record<string, unknown>,
  setupFeeCents: number | null,
  isProjectPaid: boolean,
): ReturnType<typeof resolveFreelancerPayoutFields> {
  const rate = Number(row.freelancer_commission_rate ?? 0);
  const payoutCents =
    row.freelancer_payout_cents !== undefined
      ? ((row.freelancer_payout_cents as number) ?? 0)
      : isProjectPaid
        ? calculateFreelancerPayoutCents(setupFeeCents, rate)
        : 0;
  const paidCents =
    row.freelancer_paid_cents !== undefined
      ? ((row.freelancer_paid_cents as number) ?? 0)
      : 0;

  return resolveFreelancerPayoutFields({
    freelancerPayoutCents: payoutCents,
    freelancerPaidCents: paidCents,
  });
}

function mapClientRevenueRow(
  row: Record<string, unknown>,
  retainerInvoices: RetainerPeriodInvoiceRef[],
  commissionPayouts: import("./types").CommissionPayoutRecord[],
  freelancerPayouts: import("./types").ClientFreelancerPayoutRecord[],
  paidRetainerStats: import("./client-revenue-sync").PaidRetainerInvoiceStats = {
    revenue_cents: 0,
    paid_months: 0,
  },
  commissionEntry: import("./types").CommissionEntryRecord | null = null,
  paidCommissionProfileIds: Set<string> = new Set(),
  resolvedSetterId?: string | null,
  setterAttributionDebug?: import("./lead-attribution").SetterAttributionDebug,
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
  const lead = Array.isArray(row.lead) ? row.lead[0] : row.lead;
  const leadOwnerId = (lead as { owner_id?: string | null } | null)?.owner_id ?? null;
  const leadSetterId = (lead as { setter_id?: string | null } | null)?.setter_id ?? null;
  const leadCreatedBy = (lead as { created_by?: string | null } | null)?.created_by ?? null;
  const clientSetterId = (row.setter_id as string | null) ?? null;
  const rawSetterId =
    resolvedSetterId ?? clientSetterId ?? leadSetterId;
  const rawCloserId = (row.closer_id as string | null) ?? null;
  const acquiredByName = (row.acquired_by as string | null)?.trim() || null;
  const resolvedSetterProfile = resolveAttributionProfile(
    rawSetterId,
    row.setter,
    (lead as { setter?: unknown } | null)?.setter,
    leadCreatedBy === rawSetterId ? (lead as { creator?: unknown } | null)?.creator : null,
  );
  const resolvedCloserProfile = resolveAttributionProfile(
    rawCloserId,
    row.closer,
  );
  const assignedFreelancer = Array.isArray(row.assigned_freelancer)
    ? row.assigned_freelancer[0]
    : row.assigned_freelancer;
  const freelancerMember = assignedFreelancer as {
    full_name: string | null;
    email: string;
  } | null;
  const freelancerCommissionRate = Number(row.freelancer_commission_rate ?? 0);
  const monthlyRevenueCents = (row.monthly_revenue_cents as number | null) ?? null;
  const monthlyRetainerCents = (row.monthly_retainer_cents as number | null) ?? null;
  const setupFeeCents = (row.setup_fee_cents as number | null) ?? null;
  const contractStartDate = (row.contract_start_date as string | null) ?? null;
  const contractStatus = resolveContractStatus(row);
  const autoInvoiceEnabled = Boolean(row.auto_invoice_enabled);
  const commissionFields = computeEntryCommissionTotals(
    commissionEntry,
    paidCommissionProfileIds,
  );
  const isProjectPaid = isClientSetupInvoicePaid(retainerInvoices);
  const freelancerFields = resolveFreelancerFields(
    row,
    setupFeeCents,
    isProjectPaid,
  );
  const previewFreelancerPayoutCents = calculateFreelancerPayoutCents(
    setupFeeCents,
    freelancerCommissionRate,
  );
  const salesAttribution = buildResolvedSalesAttribution({
    projectValueCents: commissionEntry?.project_value_cents ?? setupFeeCents,
    setterId: rawSetterId,
    closerId: rawCloserId,
    setterProfile: resolvedSetterProfile
      ? {
          id: resolvedSetterProfile.id ?? rawSetterId ?? "",
          full_name: resolvedSetterProfile.full_name,
          email: resolvedSetterProfile.email,
          agency_role: resolvedSetterProfile.agency_role,
          setter_commission_rate: resolvedSetterProfile.setter_commission_rate,
          closer_commission_rate: resolvedCloserProfile?.closer_commission_rate,
        }
      : null,
    closerProfile: resolvedCloserProfile
      ? {
          id: resolvedCloserProfile.id ?? rawCloserId ?? "",
          full_name: resolvedCloserProfile.full_name,
          email: resolvedCloserProfile.email,
          agency_role: resolvedCloserProfile.agency_role,
          setter_commission_rate: resolvedSetterProfile?.setter_commission_rate,
          closer_commission_rate: resolvedCloserProfile.closer_commission_rate,
        }
      : null,
    leadOwnerId,
    acquiredByName,
    setterName: commissionEntry?.setter_name ?? undefined,
    closerName: commissionEntry?.closer_name ?? undefined,
    setterRate: commissionEntry?.setter_rate,
    closerRate: commissionEntry?.closer_rate,
  });
  const commissionPayoutStatus = resolveClientCommissionPayoutStatus(
    commissionEntry,
    paidCommissionProfileIds,
  );
  const retainerStats = buildRetainerStats({
    contract_start_date: contractStartDate,
    contract_status: contractStatus,
    setup_fee_cents: setupFeeCents,
    monthly_revenue_cents: monthlyRevenueCents,
    retainerInvoices,
  });
  const totalRevenue =
    retainerStats.setup_revenue_cents + paidRetainerStats.revenue_cents;

  return {
    id: row.id as string,
    company_name: row.company_name as string,
    responsible_member_id: (row.responsible_member_id as string | null) ?? null,
    responsible_member_name: formatMemberName(member),
    monthly_revenue_cents: monthlyRevenueCents,
    monthly_retainer_cents: monthlyRetainerCents,
    setup_fee_cents: setupFeeCents,
    contract_start_date: contractStartDate,
    contract_status: contractStatus,
    auto_invoice_enabled: autoInvoiceEnabled,
    total_revenue_cents: totalRevenue > 0 ? totalRevenue : null,
    setup_revenue_cents: retainerStats.setup_revenue_cents,
    retainer_revenue_cents: paidRetainerStats.revenue_cents,
    months_active: retainerStats.months_active,
    months_paid: paidRetainerStats.paid_months,
    months_open: retainerStats.months_open,
    next_payment_due: retainerStats.next_payment_due,
    outstanding_retainer_cents: retainerStats.outstanding_retainer_cents,
    retainer_periods: buildRetainerPeriodViews(
      contractStartDate,
      monthlyRevenueCents,
      retainerInvoices,
    ),
    retainer_invoices: retainerInvoices,
    commission_status: row.commission_status as CommissionStatus,
    commission_rate: commissionRate,
    setter_id: salesAttribution.setter.id,
    setter_name: salesAttribution.setter.name,
    setter_commission_rate: salesAttribution.setter.rate,
    closer_id: salesAttribution.closer.id,
    closer_name: salesAttribution.closer.name,
    closer_commission_rate: salesAttribution.closer.rate,
    setter_commission_cents: salesAttribution.setterCommissionCents,
    closer_commission_cents: salesAttribution.closerCommissionCents,
    sales_agency_revenue_cents: salesAttribution.agencyRevenueCents,
    sales_deal_type: salesAttribution.dealType,
    commission_entry_id: commissionEntry?.id ?? null,
    commission_entry_status: commissionEntry?.status ?? null,
    setter_commission_paid: commissionPayoutStatus.setterPaid,
    closer_commission_paid: commissionPayoutStatus.closerPaid,
    commission_cents: commissionFields.commissionTotalCents,
    commission_total_cents: commissionFields.commissionTotalCents,
    commission_paid_cents: commissionFields.commissionPaidCents,
    commission_outstanding_cents: commissionFields.commissionOutstandingCents,
    commission_payouts: commissionPayouts,
    assigned_freelancer_id: (row.assigned_freelancer_id as string | null) ?? null,
    assigned_freelancer_name: formatMemberName(freelancerMember),
    freelancer_commission_rate: freelancerCommissionRate,
    freelancer_payout_cents: freelancerFields.freelancer_payout_cents,
    freelancer_paid_cents: freelancerFields.freelancer_paid_cents,
    freelancer_outstanding_cents: freelancerFields.freelancer_outstanding_cents,
    freelancer_payout_status: freelancerFields.freelancer_payout_status,
    agency_share_cents: calculateAgencyShareCents(
      setupFeeCents,
      previewFreelancerPayoutCents,
    ),
    is_project_paid: isProjectPaid,
    freelancer_payouts: freelancerPayouts,
    currency: (row.currency as string) ?? "EUR",
    setter_attribution_debug:
      setterAttributionDebug ??
      buildSetterAttributionDebug({
        leadSetterId,
        clientSetterId,
        resolvedSetterId: rawSetterId,
      }),
  };
}

function isActiveRetainerClient(client: ClientRevenueRecord): boolean {
  return (
    client.contract_status === "active" &&
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
  let outstandingClientFreelancerPayoutsCents = 0;
  let paidClientFreelancerPayoutsCents = 0;
  let freelancerProjectAgencyShareCents = 0;
  let outstandingRetainerPaymentsCents = 0;

  for (const client of clients) {
    totalRevenueCents += client.total_revenue_cents ?? 0;
    outstandingRetainerPaymentsCents += client.outstanding_retainer_cents;
    if (client.commission_entry_id) {
      outstandingCommissionsCents += client.commission_outstanding_cents;
      paidCommissionsCents += client.commission_paid_cents;
    }
    outstandingClientFreelancerPayoutsCents += client.freelancer_outstanding_cents;
    paidClientFreelancerPayoutsCents += client.freelancer_paid_cents;
    if (
      client.assigned_freelancer_id &&
      (client.freelancer_commission_rate > 0 || client.freelancer_payout_cents > 0)
    ) {
      freelancerProjectAgencyShareCents += client.agency_share_cents;
    }

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
    outstandingClientFreelancerPayoutsCents,
    paidClientFreelancerPayoutsCents,
    agencyProfitAfterFreelancerPayoutsCents:
      (totalProfit?.profitCents ?? 0),
    freelancerProjectAgencyShareCents,
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
  const [
    { rows },
    retainerInvoices,
    commissionPayouts,
    clientFreelancerPayouts,
    paidRetainerStatsByClient,
    commissionEntries,
    commissionPayoutProfiles,
  ] = await Promise.all([
    fetchClientRevenueRows(supabase),
    fetchRetainerInvoices(supabase),
    fetchCommissionPayouts(supabase),
    fetchClientFreelancerPayouts(supabase),
    fetchPaidRetainerInvoiceStatsByClient(supabase, clientIds),
    fetchCommissionEntries(supabase),
    fetchCommissionPayoutProfileIds(supabase),
  ]);

  const entriesByClient = groupLatestCommissionEntryByClient(commissionEntries);
  const paidProfilesByClient = groupPaidProfilesByClient(
    entriesByClient,
    commissionPayoutProfiles,
  );

  const filteredRows = clientIds
    ? rows.filter((row) => clientIds.includes(row.id as string))
    : rows;

  const invoicesByClient = groupRetainerInvoicesByClient(retainerInvoices);
  const payoutsByClient = groupCommissionPayoutsByClient(commissionPayouts);
  const freelancerPayoutsByClient =
    groupClientFreelancerPayoutsByClient(clientFreelancerPayouts);

  return Promise.all(
    filteredRows.map(async (row) => {
      const lead = Array.isArray(row.lead) ? row.lead[0] : row.lead;
      const leadSetterId = (lead as { setter_id?: string | null } | null)?.setter_id ?? null;
      const leadCreatedBy = (lead as { created_by?: string | null } | null)?.created_by ?? null;
      const leadOwnerId = (lead as { owner_id?: string | null } | null)?.owner_id ?? null;
      const clientSetterId = (row.setter_id as string | null) ?? null;
      const resolvedSetterId = await resolveClientSetterId(supabase, {
        clientSetterId,
        leadSetterId,
        leadCreatedBy,
        leadOwnerId,
      });

      if (!clientSetterId && resolvedSetterId) {
        await supabase
          .from("clients")
          .update({ setter_id: resolvedSetterId })
          .eq("id", row.id as string);
        row.setter_id = resolvedSetterId;
      }

      const setterAttributionDebug = buildSetterAttributionDebug({
        leadSetterId,
        clientSetterId,
        resolvedSetterId,
      });

      return mapClientRevenueRow(
        row,
        invoicesByClient.get(row.id as string) ?? [],
        payoutsByClient.get(row.id as string) ?? [],
        freelancerPayoutsByClient.get(row.id as string) ?? [],
        paidRetainerStatsByClient.get(row.id as string),
        entriesByClient.get(row.id as string) ?? null,
        paidProfilesByClient.get(row.id as string) ?? new Set(),
        resolvedSetterId,
        setterAttributionDebug,
      );
    }),
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

  if (
    !canAccessClient(profile, client.responsible_member_id, {
      setterId: client.setter_id,
      closerId: client.closer_id,
    })
  ) {
    return null;
  }

  const supabase = await createClient();
  const records = await buildClientRevenueRecords(supabase, [clientId]);
  return records[0] ?? null;
}
