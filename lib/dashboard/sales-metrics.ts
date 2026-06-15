import type { AgencyRole } from "@/lib/auth/types";
import { normalizeAgencyRole } from "@/lib/auth/roles";
import { isCommissionEntryOpen } from "./client-commission-status";
import type { CommissionEntryStatus } from "./commission-constants";
import {
  isPeriodMonthInRange,
  isTimestampInRange,
  type PerformanceDateRange,
} from "./performance-period";
import {
  buildRetainerStats,
  listPaidRetainerPeriods,
  type RetainerPeriodInvoiceRef,
} from "./retainer";
import type { CommissionEntryRecord } from "./types";

export interface SalesClientRow {
  id: string;
  created_at: string | null;
  setter_id: string | null;
  closer_id: string | null;
  setup_fee_cents: number | null;
  monthly_revenue_cents: number | null;
  contract_start_date: string | null;
}

export interface MemberSalesStats {
  revenueCents: number;
  setupRevenueCents: number;
  retainerRevenueCents: number;
  clientsCount: number;
  commissionTotalCents: number;
  commissionPaidCents: number;
  commissionOutstandingCents: number;
}

export interface TeamSalesKpis {
  totalRevenueCents: number;
  outstandingCommissionsCents: number;
  paidCommissionsCents: number;
}

export interface SalesMetricsContext {
  clients: SalesClientRow[];
  entriesByClient: Map<string, CommissionEntryRecord[]>;
  paidProfilesByEntry: Map<string, Set<string>>;
  retainerInvoicesByClient: Map<string, RetainerPeriodInvoiceRef[]>;
}

export interface SalesMetricsAggregation {
  statsByUser: Map<string, MemberSalesStats>;
  teamKpis: TeamSalesKpis;
}

const SALES_AGENCY_ROLES = new Set<AgencyRole>([
  "setter",
  "closer",
  "sales_manager",
]);

function emptyMemberSalesStats(): MemberSalesStats {
  return {
    revenueCents: 0,
    setupRevenueCents: 0,
    retainerRevenueCents: 0,
    clientsCount: 0,
    commissionTotalCents: 0,
    commissionPaidCents: 0,
    commissionOutstandingCents: 0,
  };
}

function getOrCreateMemberStats(
  map: Map<string, MemberSalesStats>,
  userId: string,
): MemberSalesStats {
  const current = map.get(userId) ?? emptyMemberSalesStats();
  map.set(userId, current);
  return current;
}

export function isSalesAgencyRole(
  agencyRole: AgencyRole | string | null | undefined,
): boolean {
  const normalized = normalizeAgencyRole(agencyRole);
  return normalized != null && SALES_AGENCY_ROLES.has(normalized);
}

export function isProjectFreelancerProfile(input: {
  role: string;
  agency_role?: AgencyRole | string | null;
}): boolean {
  if (input.role !== "freelancer") return false;
  return !isSalesAgencyRole(input.agency_role);
}

export function clientIncludedInPeriod(
  createdAt: string | null,
  range: PerformanceDateRange,
): boolean {
  if (range.start === null) return true;
  return isTimestampInRange(createdAt, range);
}

export function clientQualifiesForSalesPeriod(
  client: SalesClientRow,
  range: PerformanceDateRange,
  retainerInvoicesByClient: Map<string, RetainerPeriodInvoiceRef[]>,
): boolean {
  const createdAt = client.created_at;
  if (clientIncludedInPeriod(createdAt, range)) return true;
  if (range.start === null) return true;

  const clientInvoices = retainerInvoicesByClient.get(client.id) ?? [];
  const hasRetainerInRange = listPaidRetainerPeriods(clientInvoices).some(
    (period) =>
      isPeriodMonthInRange(period.period_year, period.period_month, range),
  );
  if (hasRetainerInRange) return true;

  return isTimestampInRange(createdAt, range);
}

export function computeClientRevenueInRange(
  client: SalesClientRow,
  entry: CommissionEntryRecord | null,
  retainerInvoicesByClient: Map<string, RetainerPeriodInvoiceRef[]>,
  range: PerformanceDateRange,
): {
  setupRevenueCents: number;
  retainerRevenueCents: number;
  revenueCents: number;
} {
  const setupFeeCents =
    entry?.project_value_cents ??
    (client.setup_fee_cents as number | null) ??
    0;
  const monthlyRevenueCents = (client.monthly_revenue_cents as number | null) ?? 0;
  const clientInvoices = retainerInvoicesByClient.get(client.id) ?? [];

  if (range.start === null) {
    const stats = buildRetainerStats({
      contract_start_date: client.contract_start_date,
      setup_fee_cents: setupFeeCents,
      monthly_revenue_cents: monthlyRevenueCents,
      retainerInvoices: clientInvoices,
    });
    return {
      setupRevenueCents: stats.setup_revenue_cents,
      retainerRevenueCents: stats.retainer_revenue_cents,
      revenueCents: stats.total_revenue_cents,
    };
  }

  const revenueAnchor = entry?.created_at ?? client.created_at;
  const includeSetup = isTimestampInRange(revenueAnchor, range);
  const setupRevenueCents = includeSetup ? setupFeeCents : 0;

  let retainerRevenueCents = 0;
  for (const period of listPaidRetainerPeriods(clientInvoices)) {
    if (
      isPeriodMonthInRange(period.period_year, period.period_month, range)
    ) {
      retainerRevenueCents += monthlyRevenueCents;
    }
  }

  return {
    setupRevenueCents,
    retainerRevenueCents,
    revenueCents: setupRevenueCents + retainerRevenueCents,
  };
}

export function computeEntryCommissionTotals(
  entry: CommissionEntryRecord | null,
  paidProfileIds: Set<string>,
): {
  commissionTotalCents: number;
  commissionPaidCents: number;
  commissionOutstandingCents: number;
} {
  if (!entry || entry.status === ("cancelled" as CommissionEntryStatus)) {
    return {
      commissionTotalCents: 0,
      commissionPaidCents: 0,
      commissionOutstandingCents: 0,
    };
  }

  let commissionPaidCents = 0;
  let commissionOutstandingCents = 0;

  if (entry.setter_id && entry.setter_commission_cents > 0) {
    if (paidProfileIds.has(entry.setter_id)) {
      commissionPaidCents += entry.setter_commission_cents;
    } else if (isCommissionEntryOpen(entry.status)) {
      commissionOutstandingCents += entry.setter_commission_cents;
    }
  }

  if (entry.closer_id && entry.closer_commission_cents > 0) {
    if (paidProfileIds.has(entry.closer_id)) {
      commissionPaidCents += entry.closer_commission_cents;
    } else if (isCommissionEntryOpen(entry.status)) {
      commissionOutstandingCents += entry.closer_commission_cents;
    }
  }

  return {
    commissionTotalCents:
      entry.setter_commission_cents + entry.closer_commission_cents,
    commissionPaidCents,
    commissionOutstandingCents,
  };
}

export function aggregateCommissionKpisFromEntries(
  entries: CommissionEntryRecord[],
  paidProfilesByEntry: Map<string, Set<string>>,
): Pick<TeamSalesKpis, "outstandingCommissionsCents" | "paidCommissionsCents"> {
  let outstandingCommissionsCents = 0;
  let paidCommissionsCents = 0;

  for (const entry of entries) {
    if (entry.status === ("cancelled" as CommissionEntryStatus)) continue;
    const totals = computeEntryCommissionTotals(
      entry,
      paidProfilesByEntry.get(entry.id) ?? new Set<string>(),
    );
    outstandingCommissionsCents += totals.commissionOutstandingCents;
    paidCommissionsCents += totals.commissionPaidCents;
  }

  return { outstandingCommissionsCents, paidCommissionsCents };
}

export function computeMemberRoleCommission(
  entry: CommissionEntryRecord,
  profileId: string,
  paidProfileIds: Set<string>,
): {
  earnedCents: number;
  paidCents: number;
  outstandingCents: number;
} {
  let earnedCents = 0;
  let paidCents = 0;
  let outstandingCents = 0;

  if (entry.setter_id === profileId && entry.setter_commission_cents > 0) {
    earnedCents += entry.setter_commission_cents;
    if (paidProfileIds.has(profileId)) {
      paidCents += entry.setter_commission_cents;
    } else if (isCommissionEntryOpen(entry.status)) {
      outstandingCents += entry.setter_commission_cents;
    }
  }

  if (entry.closer_id === profileId && entry.closer_commission_cents > 0) {
    earnedCents += entry.closer_commission_cents;
    if (paidProfileIds.has(profileId)) {
      paidCents += entry.closer_commission_cents;
    } else if (isCommissionEntryOpen(entry.status)) {
      outstandingCents += entry.closer_commission_cents;
    }
  }

  return { earnedCents, paidCents, outstandingCents };
}

export function resolveSalesMemberIds(
  client: SalesClientRow,
  entry: CommissionEntryRecord | null,
): string[] {
  const setterId = entry?.setter_id ?? client.setter_id;
  const closerId = entry?.closer_id ?? client.closer_id;
  return [...new Set([setterId, closerId].filter(Boolean) as string[])];
}

export function aggregateSalesMetrics(
  context: SalesMetricsContext,
  range: PerformanceDateRange,
): SalesMetricsAggregation {
  const statsByUser = new Map<string, MemberSalesStats>();
  let totalRevenueCents = 0;
  let outstandingCommissionsCents = 0;
  let paidCommissionsCents = 0;

  for (const client of context.clients) {
    if (
      !clientQualifiesForSalesPeriod(
        client,
        range,
        context.retainerInvoicesByClient,
      )
    ) {
      continue;
    }

    const clientEntries = context.entriesByClient.get(client.id) ?? [];
    const latestEntry = clientEntries[0] ?? null;
    const revenue = computeClientRevenueInRange(
      client,
      latestEntry,
      context.retainerInvoicesByClient,
      range,
    );
    const includeClientCount = clientIncludedInPeriod(client.created_at, range);
    const salesMemberIds = resolveSalesMemberIds(client, latestEntry);

    if (salesMemberIds.length === 0) continue;

    totalRevenueCents += revenue.revenueCents;

    for (const memberId of salesMemberIds) {
      const stats = getOrCreateMemberStats(statsByUser, memberId);
      stats.revenueCents += revenue.revenueCents;
      stats.setupRevenueCents += revenue.setupRevenueCents;
      stats.retainerRevenueCents += revenue.retainerRevenueCents;
      if (includeClientCount) stats.clientsCount += 1;

      for (const entry of clientEntries) {
        if (entry.status === ("cancelled" as CommissionEntryStatus)) continue;
        const commission = computeMemberRoleCommission(
          entry,
          memberId,
          context.paidProfilesByEntry.get(entry.id) ?? new Set<string>(),
        );
        stats.commissionTotalCents += commission.earnedCents;
        stats.commissionPaidCents += commission.paidCents;
        stats.commissionOutstandingCents += commission.outstandingCents;
      }
    }
  }

  for (const stats of statsByUser.values()) {
    outstandingCommissionsCents += stats.commissionOutstandingCents;
    paidCommissionsCents += stats.commissionPaidCents;
  }

  return {
    statsByUser,
    teamKpis: {
      totalRevenueCents,
      outstandingCommissionsCents,
      paidCommissionsCents,
    },
  };
}
