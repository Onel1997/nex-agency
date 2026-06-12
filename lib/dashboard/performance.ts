import {
  canAccessFinanceRoutes,
  isManagement,
} from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { syncCommissionAmounts } from "./commission";
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
  buildRetainerStats,
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

function isFreelancerRole(role: string) {
  return role === "freelancer";
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

function resolveCommissionFields(
  client: Record<string, unknown>,
  commissionRate: number,
) {
  if (client.commission_total_cents !== undefined) {
    return {
      commissionTotalCents: (client.commission_total_cents as number) ?? 0,
      commissionPaidCents: (client.commission_paid_cents as number) ?? 0,
      commissionOutstandingCents:
        (client.commission_outstanding_cents as number) ?? 0,
    };
  }

  const synced = syncCommissionAmounts({
    setupFeeCents: (client.setup_fee_cents as number | null) ?? null,
    commissionRate,
    currentTotalCents: 0,
    currentPaidCents: 0,
  });

  return {
    commissionTotalCents: synced.commission_total_cents,
    commissionPaidCents: synced.commission_paid_cents,
    commissionOutstandingCents: synced.commission_outstanding_cents,
  };
}

function computeClientRevenueInRange(
  client: Record<string, unknown>,
  retainerInvoicesByClient: Map<string, RetainerPeriodInvoiceRef[]>,
  range: PerformanceDateRange,
) {
  const clientId = client.id as string;
  const createdAt = client.created_at as string | null;
  const setupFeeCents = (client.setup_fee_cents as number | null) ?? 0;
  const monthlyRevenueCents = (client.monthly_revenue_cents as number | null) ?? 0;
  const clientInvoices = retainerInvoicesByClient.get(clientId) ?? [];

  if (range.start === null) {
    const stats = buildRetainerStats({
      contract_start_date: (client.contract_start_date as string | null) ?? null,
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

  const includeSetup = isTimestampInRange(createdAt, range);
  const setupRevenueCents = includeSetup ? setupFeeCents : 0;

  let retainerRevenueCents = 0;
  for (const period of listPaidRetainerPeriods(clientInvoices)) {
    if (
      isPeriodMonthInRange(
        period.period_year,
        period.period_month,
        range,
      )
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

function clientIncludedInPeriod(
  createdAt: string | null,
  range: PerformanceDateRange,
) {
  if (range.start === null) return true;
  return isTimestampInRange(createdAt, range);
}

function buildRevenueTrend(
  clients: Record<string, unknown>[],
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
    const clientId = client.id as string;
    const createdAt = client.created_at as string | null;
    const setupFeeCents = (client.setup_fee_cents as number | null) ?? 0;
    const monthlyRevenueCents = (client.monthly_revenue_cents as number | null) ?? 0;
    const clientInvoices = retainerInvoicesByClient.get(clientId) ?? [];

    if (createdAt) {
      const created = new Date(createdAt);
      if (!Number.isNaN(created.getTime()) && setupFeeCents > 0) {
        if (
          range.start === null ||
          isTimestampInRange(createdAt, range)
        ) {
          addToMonth(
            created.getFullYear(),
            created.getMonth() + 1,
            setupFeeCents,
          );
        }
      }
    }

    for (const period of listPaidRetainerPeriods(clientInvoices)) {
      if (
        range.start !== null &&
        !isPeriodMonthInRange(
          period.period_year,
          period.period_month,
          range,
        )
      ) {
        continue;
      }
      addToMonth(
        period.period_year,
        period.period_month,
        monthlyRevenueCents,
      );
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
      const aFreelancer = isFreelancerRole(a.role);
      const bFreelancer = isFreelancerRole(b.role);
      if (aFreelancer && bFreelancer) {
        return b.freelancerEarnedCents - a.freelancerEarnedCents;
      }
      if (aFreelancer !== bFreelancer) {
        return aFreelancer ? 1 : -1;
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
  members: PerformanceMemberRow[],
  appointmentsCount: number,
): PerformanceKpis {
  const salesMembers = members.filter(
    (member) => !isFreelancerRole(member.role),
  );
  const totalLeads = leads.length;
  const wonLeads = leads.filter((lead) => lead.status === "won").length;

  return {
    totalLeads,
    wonLeads,
    conversionRate:
      totalLeads > 0
        ? Math.round((wonLeads / totalLeads) * 1000) / 10
        : 0,
    totalRevenueCents: salesMembers.reduce(
      (sum, member) => sum + member.revenueCents,
      0,
    ),
    outstandingCommissionsCents: salesMembers.reduce(
      (sum, member) => sum + member.commissionOutstandingCents,
      0,
    ),
    paidCommissionsCents: salesMembers.reduce(
      (sum, member) => sum + member.commissionPaidCents,
      0,
    ),
    appointmentsCount,
  };
}

function buildCommissionBars(members: PerformanceMemberRow[]): PerformanceCommissionBars {
  const salesMembers = members.filter(
    (member) => !isFreelancerRole(member.role),
  );
  return {
    outstandingCents: salesMembers.reduce(
      (sum, member) => sum + member.commissionOutstandingCents,
      0,
    ),
    paidCents: salesMembers.reduce(
      (sum, member) => sum + member.commissionPaidCents,
      0,
    ),
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
  ] = await Promise.all([
    teamView
      ? supabase
          .from("profiles")
          .select("id, full_name, email, role, commission_rate")
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
              commission_rate: profile.commission_rate,
            },
          ],
          error: null,
        }),
    supabase.from("leads").select("id, owner_id, status, created_at"),
    fetchPerformanceClientRows(supabase),
    fetchRetainerInvoices(supabase),
    supabase.from("appointments").select("id, assigned_user_id, start_time"),
  ]);

  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (leadsResult.error) throw new Error(leadsResult.error.message);
  if (appointmentsResult.error) {
    throw new Error(appointmentsResult.error.message);
  }

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const freelancerIds = new Set(
    profiles.filter((entry) => isFreelancerRole(entry.role)).map((entry) => entry.id),
  );
  const allLeads = leadsResult.data ?? [];
  const allAppointments = appointmentsResult.data ?? [];
  const { rows: clientRows } = clientsResult;
  const retainerInvoicesByClient = groupRetainerInvoicesByClient(retainerInvoices);

  const filteredLeads = allLeads.filter((lead) =>
    isTimestampInRange(lead.created_at, range),
  );
  const filteredAppointments = allAppointments.filter((appointment) =>
    isTimestampInRange(appointment.start_time, range),
  );

  const statsByUser = new Map<string, MemberAccumulator>();

  for (const lead of filteredLeads) {
    if (!lead.owner_id || freelancerIds.has(lead.owner_id)) continue;
    const current = getOrCreateAccumulator(statsByUser, lead.owner_id);
    current.leadsCount += 1;
    if (lead.status === "won") current.leadsWon += 1;
  }

  for (const appointment of filteredAppointments) {
    if (!appointment.assigned_user_id || freelancerIds.has(appointment.assigned_user_id)) {
      continue;
    }
    const current = getOrCreateAccumulator(
      statsByUser,
      appointment.assigned_user_id,
    );
    current.appointmentsCount += 1;
  }

  for (const clientRow of clientRows) {
    const client = clientRow as Record<string, unknown>;
    const responsibleMemberId = client.responsible_member_id as string | null;
    if (!responsibleMemberId || freelancerIds.has(responsibleMemberId)) continue;

    const createdAt = client.created_at as string | null;
    const includeClientCount = clientIncludedInPeriod(createdAt, range);
    if (!includeClientCount && range.start !== null) {
      const clientId = client.id as string;
      const hasRetainerInRange = listPaidRetainerPeriods(
        retainerInvoicesByClient.get(clientId) ?? [],
      ).some((period) =>
        isPeriodMonthInRange(
          period.period_year,
          period.period_month,
          range,
        ),
      );
      if (!hasRetainerInRange && !isTimestampInRange(createdAt, range)) {
        continue;
      }
    }

    const member = Array.isArray(client.responsible_member)
      ? client.responsible_member[0]
      : client.responsible_member;
    const rate =
      (member as { commission_rate: number } | null)?.commission_rate ?? 0;
    const revenue = computeClientRevenueInRange(
      client,
      retainerInvoicesByClient,
      range,
    );
    const commission = resolveCommissionFields(client, rate);

    const current = getOrCreateAccumulator(statsByUser, responsibleMemberId);
    if (includeClientCount) current.clientsCount += 1;
    current.setupRevenueCents += revenue.setupRevenueCents;
    current.retainerRevenueCents += revenue.retainerRevenueCents;
    current.revenueCents += revenue.revenueCents;

    if (includeClientCount || range.start === null) {
      current.commissionTotalCents += commission.commissionTotalCents;
      current.commissionPaidCents += commission.commissionPaidCents;
      current.commissionOutstandingCents +=
        commission.commissionOutstandingCents;
    }
  }

  for (const clientRow of clientRows) {
    const client = clientRow as Record<string, unknown>;
    const assignedFreelancerId = client.assigned_freelancer_id as string | null;
    if (!assignedFreelancerId || !freelancerIds.has(assignedFreelancerId)) {
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
  const viewerIsFreelancer = isFreelancerRole(profile.role);
  const viewerMember = members.find((member) => member.userId === profile.id);
  const revenueTrend = buildRevenueTrend(
    clientRows as Record<string, unknown>[],
    retainerInvoicesByClient,
    range,
  );

  return {
    period,
    isTeamView: teamView,
    viewerIsFreelancer,
    kpis: buildKpis(
      filteredLeads.filter(
        (lead) => !lead.owner_id || !freelancerIds.has(lead.owner_id),
      ),
      members,
      filteredAppointments.filter(
        (appointment) =>
          !appointment.assigned_user_id ||
          !freelancerIds.has(appointment.assigned_user_id),
      ).length,
    ),
    freelancerKpis:
      viewerIsFreelancer && viewerMember
        ? buildFreelancerKpis(viewerMember)
        : null,
    members,
    revenueTrend,
    leadsByStatus: buildLeadStatusSlices(
      filteredLeads.filter(
        (lead) => !lead.owner_id || !freelancerIds.has(lead.owner_id),
      ),
    ),
    commissions: buildCommissionBars(members),
  };
}

/** @deprecated Use getPerformanceDashboardData — kept for finance commission editor */
export async function getTeamPerformanceStats(): Promise<TeamPerformanceStats[] | null> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) return null;

  const data = await getPerformanceDashboardData("all");
  if (!data) return null;

  return data.members
    .filter((member) => !isFreelancerRole(member.role))
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
