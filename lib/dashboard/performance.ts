import {
  canAccessFinanceRoutes,
  isManagement,
} from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  fetchCommissionEntries,
  fetchCommissionPayoutProfileIds,
  groupCommissionEntriesByClient,
} from "./commission-entries-data";
import { LEAD_STATUS_LABELS, type LeadStatus } from "./constants";
import {
  getPerformanceDateRange,
  isPeriodMonthInRange,
  isTimestampInRange,
  type PerformanceDateRange,
  type PerformancePeriod,
} from "./performance-period";
import {
  fetchPerformanceClientRows,
  fetchRetainerInvoices,
  groupRetainerInvoicesByClient,
} from "./retainer-data";
import {
  aggregateSalesMetrics,
  clientIncludedInPeriod,
  computeClientRevenueInRange,
  isProjectFreelancerProfile,
  isSalesAgencyRole,
  type SalesClientRow,
  type TeamSalesKpis,
} from "./sales-metrics";
import {
  listPaidRetainerPeriods,
  type RetainerPeriodInvoiceRef,
} from "./retainer";
import type {
  PerformanceCommissionBars,
  PerformanceDashboardData,
  PerformanceFreelancerKpis,
  PerformanceKpis,
  PerformanceLeadStatusSlice,
  PerformanceMemberRow,
  PerformanceRevenuePoint,
  TeamPerformanceStats,
} from "./types";

const DONUT_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
];

interface MemberAccumulator {
  leadsCount: number;
  leadsWon: number;
  clientsCount: number;
  setupRevenueCents: number;
  retainerRevenueCents: number;
  revenueCents: number;
  commissionTotalCents: number;
  commissionPaidCents: number;
  commissionOutstandingCents: number;
  appointmentsCount: number;
  projectsCount: number;
  projectVolumeCents: number;
  freelancerEarnedCents: number;
  freelancerPaidCents: number;
  freelancerOutstandingCents: number;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  agency_role: string | null;
  commission_rate: number | null;
}

function emptyAccumulator(): MemberAccumulator {
  return {
    leadsCount: 0,
    leadsWon: 0,
    clientsCount: 0,
    setupRevenueCents: 0,
    retainerRevenueCents: 0,
    revenueCents: 0,
    commissionTotalCents: 0,
    commissionPaidCents: 0,
    commissionOutstandingCents: 0,
    appointmentsCount: 0,
    projectsCount: 0,
    projectVolumeCents: 0,
    freelancerEarnedCents: 0,
    freelancerPaidCents: 0,
    freelancerOutstandingCents: 0,
  };
}

function resolveProjectVolumeCents(client: Record<string, unknown>) {
  const oneTime = (client.one_time_project_value_cents as number | null) ?? 0;
  if (oneTime > 0) return oneTime;
  return (client.setup_fee_cents as number | null) ?? 0;
}

function getOrCreateAccumulator(
  map: Map<string, MemberAccumulator>,
  userId: string,
) {
  const current = map.get(userId) ?? emptyAccumulator();
  map.set(userId, current);
  return current;
}

function formatMemberName(profile: ProfileRow) {
  return profile.full_name?.trim() || profile.email.split("@")[0];
}

function computeConversionRate(leads: number, clients: number) {
  if (leads <= 0) return 0;
  return Math.round((clients / leads) * 1000) / 10;
}

function mapClientToSalesRow(client: Record<string, unknown>): SalesClientRow {
  return {
    id: client.id as string,
    created_at: (client.created_at as string | null) ?? null,
    setter_id: (client.setter_id as string | null) ?? null,
    closer_id: (client.closer_id as string | null) ?? null,
    setup_fee_cents: (client.setup_fee_cents as number | null) ?? null,
    monthly_revenue_cents: (client.monthly_revenue_cents as number | null) ?? null,
    contract_start_date: (client.contract_start_date as string | null) ?? null,
  };
}

function shouldSkipNonSalesOwner(
  ownerId: string | null,
  profileById: Map<string, ProfileRow>,
): boolean {
  if (!ownerId) return true;
  const owner = profileById.get(ownerId);
  if (!owner) return false;
  return isProjectFreelancerProfile(owner);
}

function buildRevenueTrend(
  clients: SalesClientRow[],
  entriesByClient: Map<string, import("./types").CommissionEntryRecord[]>,
  retainerInvoicesByClient: Map<string, RetainerPeriodInvoiceRef[]>,
  range: PerformanceDateRange,
): PerformanceRevenuePoint[] {
  const monthTotals = new Map<string, number>();

  const addToMonth = (year: number, month: number, cents: number) => {
    if (cents <= 0) return;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    monthTotals.set(key, (monthTotals.get(key) ?? 0) + cents);
  };

  for (const client of clients) {
    const entry = entriesByClient.get(client.id)?.[0] ?? null;
    const revenue = computeClientRevenueInRange(
      client,
      entry,
      retainerInvoicesByClient,
      range,
    );
    const anchor = entry?.created_at ?? client.created_at;
    if (revenue.setupRevenueCents > 0 && anchor) {
      const date = new Date(anchor);
      if (!Number.isNaN(date.getTime())) {
        addToMonth(date.getFullYear(), date.getMonth() + 1, revenue.setupRevenueCents);
      }
    }

    const monthlyRevenueCents = client.monthly_revenue_cents ?? 0;
    const clientInvoices = retainerInvoicesByClient.get(client.id) ?? [];
    for (const period of listPaidRetainerPeriods(clientInvoices)) {
      if (
        range.start !== null &&
        !isPeriodMonthInRange(period.period_year, period.period_month, range)
      ) {
        continue;
      }
      addToMonth(period.period_year, period.period_month, monthlyRevenueCents);
    }
  }

  return [...monthTotals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, revenueCents]) => {
      const [year, month] = key.split("-").map(Number);
      const label = new Intl.DateTimeFormat("de-DE", {
        month: "short",
        year: "numeric",
      }).format(new Date(year, month - 1, 1));
      return { label, revenueCents };
    });
}

function buildLeadStatusSlices(
  leads: Array<{ status: string }>,
): PerformanceLeadStatusSlice[] {
  const counts = new Map<string, number>();
  for (const lead of leads) {
    counts.set(lead.status, (counts.get(lead.status) ?? 0) + 1);
  }

  return DONUT_STATUSES.map((status) => ({
    status,
    label: LEAD_STATUS_LABELS[status],
    count: counts.get(status) ?? 0,
  }));
}

function isProjectFreelancerMember(member: PerformanceMemberRow): boolean {
  return (
    member.role === "freelancer" && !isSalesAgencyRole(member.agencyRole)
  );
}

function mapMemberRows(
  profiles: ProfileRow[],
  statsByUser: Map<string, MemberAccumulator>,
): PerformanceMemberRow[] {
  return profiles
    .map((profile) => {
      const counts = statsByUser.get(profile.id) ?? emptyAccumulator();
      return {
        userId: profile.id,
        fullName: formatMemberName(profile),
        email: profile.email,
        role: profile.role,
        agencyRole: profile.agency_role,
        commissionRate: Number(profile.commission_rate ?? 0),
        leadsCount: counts.leadsCount,
        leadsWon: counts.leadsWon,
        clientsCount: counts.clientsCount,
        revenueCents: counts.revenueCents,
        commissionTotalCents: counts.commissionTotalCents,
        commissionPaidCents: counts.commissionPaidCents,
        commissionOutstandingCents: counts.commissionOutstandingCents,
        appointmentsCount: counts.appointmentsCount,
        conversionRate: computeConversionRate(
          counts.leadsCount,
          counts.clientsCount,
        ),
        projectsCount: counts.projectsCount,
        projectVolumeCents: counts.projectVolumeCents,
        freelancerEarnedCents: counts.freelancerEarnedCents,
        freelancerPaidCents: counts.freelancerPaidCents,
        freelancerOutstandingCents: counts.freelancerOutstandingCents,
      };
    })
    .sort((a, b) => {
      const aProjectFreelancer = isProjectFreelancerMember(a);
      const bProjectFreelancer = isProjectFreelancerMember(b);
      if (aProjectFreelancer && bProjectFreelancer) {
        return b.freelancerEarnedCents - a.freelancerEarnedCents;
      }
      if (aProjectFreelancer !== bProjectFreelancer) {
        return aProjectFreelancer ? 1 : -1;
      }
      return b.revenueCents - a.revenueCents;
    });
}

function buildFreelancerKpis(
  member: PerformanceMemberRow,
): PerformanceFreelancerKpis {
  return {
    projectsCount: member.projectsCount,
    projectVolumeCents: member.projectVolumeCents,
    earnedCents: member.freelancerEarnedCents,
    paidCents: member.freelancerPaidCents,
    outstandingCents: member.freelancerOutstandingCents,
  };
}

function buildKpis(
  leads: Array<{ status: string }>,
  teamKpis: TeamSalesKpis,
  appointmentsCount: number,
): PerformanceKpis {
  const totalLeads = leads.length;
  const wonLeads = leads.filter((lead) => lead.status === "won").length;

  return {
    totalLeads,
    wonLeads,
    conversionRate:
      totalLeads > 0
        ? Math.round((wonLeads / totalLeads) * 1000) / 10
        : 0,
    totalRevenueCents: teamKpis.totalRevenueCents,
    outstandingCommissionsCents: teamKpis.outstandingCommissionsCents,
    paidCommissionsCents: teamKpis.paidCommissionsCents,
    appointmentsCount,
  };
}

function buildCommissionBars(teamKpis: TeamSalesKpis): PerformanceCommissionBars {
  return {
    outstandingCents: teamKpis.outstandingCommissionsCents,
    paidCents: teamKpis.paidCommissionsCents,
  };
}

export async function getPerformanceDashboardData(
  period: PerformancePeriod = "month",
): Promise<PerformanceDashboardData | null> {
  const profile = await getProfile();
  if (!profile) return null;

  const teamView = isManagement(profile);
  const range = getPerformanceDateRange(period);
  const supabase = await createClient();

  const [
    profilesResult,
    leadsResult,
    clientsResult,
    retainerInvoices,
    appointmentsResult,
    commissionEntries,
    commissionPayoutProfiles,
  ] = await Promise.all([
    teamView
      ? supabase
          .from("profiles")
          .select("id, full_name, email, role, agency_role, commission_rate")
          .eq("status", "active")
          .not("activated_at", "is", null)
          .order("full_name")
      : Promise.resolve({
          data: [
            {
              id: profile.id,
              full_name: profile.full_name,
              email: profile.email,
              role: profile.role,
              agency_role: profile.agency_role,
              commission_rate: profile.commission_rate,
            },
          ],
          error: null,
        }),
    supabase.from("leads").select("id, owner_id, status, created_at"),
    fetchPerformanceClientRows(supabase),
    fetchRetainerInvoices(supabase),
    supabase.from("appointments").select("id, assigned_user_id, start_time"),
    fetchCommissionEntries(supabase),
    fetchCommissionPayoutProfileIds(supabase),
  ]);

  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (leadsResult.error) throw new Error(leadsResult.error.message);
  if (appointmentsResult.error) {
    throw new Error(appointmentsResult.error.message);
  }

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const profileById = new Map(profiles.map((entry) => [entry.id, entry]));
  const allLeads = leadsResult.data ?? [];
  const allAppointments = appointmentsResult.data ?? [];
  const { rows: clientRows } = clientsResult;
  const retainerInvoicesByClient = groupRetainerInvoicesByClient(retainerInvoices);
  const salesClients = clientRows.map((row) =>
    mapClientToSalesRow(row as Record<string, unknown>),
  );
  const entriesByClient = groupCommissionEntriesByClient(commissionEntries);

  const filteredLeads = allLeads.filter((lead) =>
    isTimestampInRange(lead.created_at, range),
  );
  const filteredAppointments = allAppointments.filter((appointment) =>
    isTimestampInRange(appointment.start_time, range),
  );
  const attributedLeads = filteredLeads.filter(
    (lead) => !shouldSkipNonSalesOwner(lead.owner_id, profileById),
  );
  const attributedAppointments = filteredAppointments.filter(
    (appointment) =>
      !shouldSkipNonSalesOwner(appointment.assigned_user_id, profileById),
  );

  const salesAggregation = aggregateSalesMetrics(
    {
      clients: salesClients,
      entriesByClient,
      paidProfilesByEntry: commissionPayoutProfiles,
      retainerInvoicesByClient,
    },
    range,
  );

  const statsByUser = new Map<string, MemberAccumulator>();

  for (const [userId, salesStats] of salesAggregation.statsByUser.entries()) {
    const current = getOrCreateAccumulator(statsByUser, userId);
    current.clientsCount = salesStats.clientsCount;
    current.setupRevenueCents = salesStats.setupRevenueCents;
    current.retainerRevenueCents = salesStats.retainerRevenueCents;
    current.revenueCents = salesStats.revenueCents;
    current.commissionTotalCents = salesStats.commissionTotalCents;
    current.commissionPaidCents = salesStats.commissionPaidCents;
    current.commissionOutstandingCents = salesStats.commissionOutstandingCents;
  }

  for (const lead of attributedLeads) {
    if (!lead.owner_id) continue;
    const current = getOrCreateAccumulator(statsByUser, lead.owner_id);
    current.leadsCount += 1;
    if (lead.status === "won") current.leadsWon += 1;
  }

  for (const appointment of attributedAppointments) {
    if (!appointment.assigned_user_id) continue;
    const current = getOrCreateAccumulator(
      statsByUser,
      appointment.assigned_user_id,
    );
    current.appointmentsCount += 1;
  }

  for (const clientRow of clientRows) {
    const client = clientRow as Record<string, unknown>;
    const assignedFreelancerId = client.assigned_freelancer_id as string | null;
    if (!assignedFreelancerId) continue;

    const freelancerProfile = profileById.get(assignedFreelancerId);
    if (
      !freelancerProfile ||
      !isProjectFreelancerProfile(freelancerProfile)
    ) {
      continue;
    }

    const createdAt = client.created_at as string | null;
    const includeProjectCount = clientIncludedInPeriod(createdAt, range);
    if (!includeProjectCount && range.start !== null) {
      continue;
    }

    const current = getOrCreateAccumulator(statsByUser, assignedFreelancerId);
    if (includeProjectCount) {
      current.projectsCount += 1;
      current.projectVolumeCents += resolveProjectVolumeCents(client);
    }

    if (includeProjectCount || range.start === null) {
      current.freelancerEarnedCents +=
        (client.freelancer_payout_cents as number) ?? 0;
      current.freelancerPaidCents +=
        (client.freelancer_paid_cents as number) ?? 0;
      current.freelancerOutstandingCents +=
        (client.freelancer_outstanding_cents as number) ?? 0;
    }
  }

  const members = mapMemberRows(profiles, statsByUser);
  const viewerIsProjectFreelancer = isProjectFreelancerProfile(profile);
  const viewerMember = members.find((member) => member.userId === profile.id);
  const revenueTrend = buildRevenueTrend(
    salesClients,
    entriesByClient,
    retainerInvoicesByClient,
    range,
  );
  const kpis = buildKpis(
    attributedLeads,
    salesAggregation.teamKpis,
    attributedAppointments.length,
  );
  const freelancerKpis =
    viewerIsProjectFreelancer && viewerMember
      ? buildFreelancerKpis(viewerMember)
      : null;

  return {
    period,
    isTeamView: teamView,
    viewerIsFreelancer: viewerIsProjectFreelancer,
    kpis,
    freelancerKpis,
    members,
    revenueTrend,
    leadsByStatus: buildLeadStatusSlices(attributedLeads),
    commissions: buildCommissionBars(salesAggregation.teamKpis),
  };
}

/** @deprecated Use getPerformanceDashboardData — kept for finance commission editor */
export async function getTeamPerformanceStats(): Promise<TeamPerformanceStats[] | null> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) return null;

  const data = await getPerformanceDashboardData("all");
  if (!data) return null;

  return data.members
    .filter(
      (member) =>
        isSalesAgencyRole(member.agencyRole) ||
        member.revenueCents > 0 ||
        member.commissionTotalCents > 0,
    )
    .map((member) => ({
      userId: member.userId,
      fullName: member.fullName,
      email: member.email,
      role: member.role,
      commissionRate: member.commissionRate,
      leadsCreated: member.leadsCount,
      leadsWon: member.leadsWon,
      clientsOwned: member.clientsCount,
      setupRevenueCents: 0,
      retainerRevenueCents: 0,
      revenueGeneratedCents: member.revenueCents,
      commissionsTotalCents: member.commissionTotalCents,
      commissionsPaidCents: member.commissionPaidCents,
      commissionsOutstandingCents: member.commissionOutstandingCents,
    }));
}
