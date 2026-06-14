import {
  canManageCommissions,
  isManagement,
  isSetter,
  isCloser,
} from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import type { CommissionEntryStatus } from "./commission-constants";
import {
  sumMemberCommissionEarned,
  sumMemberCommissionOpen,
} from "./commission-entries";
import { isCommissionCenterSchemaMissingError } from "./commission-entry-service";
import type {
  CommissionCenterData,
  CommissionCenterStats,
  CommissionDashboardKpis,
  CommissionEntryRecord,
  MemberCommissionSummary,
} from "./types";
import { createClient } from "@/lib/supabase/server";

function formatMemberName(profile: {
  full_name: string | null;
  email: string;
}): string {
  return profile.full_name?.trim() || profile.email.split("@")[0];
}

function mapCommissionEntryRow(row: Record<string, unknown>): CommissionEntryRecord {
  const client = Array.isArray(row.client) ? row.client[0] : row.client;
  const setter = Array.isArray(row.setter) ? row.setter[0] : row.setter;
  const closer = Array.isArray(row.closer) ? row.closer[0] : row.closer;

  return {
    id: row.id as string,
    client_id: row.client_id as string,
    client_name:
      (client as { company_name?: string } | null)?.company_name ?? "—",
    setter_id: (row.setter_id as string | null) ?? null,
    setter_name: setter
      ? formatMemberName(setter as { full_name: string | null; email: string })
      : null,
    closer_id: (row.closer_id as string | null) ?? null,
    closer_name: closer
      ? formatMemberName(closer as { full_name: string | null; email: string })
      : null,
    project_value_cents: Number(row.project_value_cents ?? 0),
    setter_rate: Number(row.setter_rate ?? 0),
    closer_rate: Number(row.closer_rate ?? 0),
    setter_commission_cents: Number(row.setter_commission_cents ?? 0),
    closer_commission_cents: Number(row.closer_commission_cents ?? 0),
    status: row.status as CommissionEntryStatus,
    triggered_by_invoice_id:
      (row.triggered_by_invoice_id as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    paid_at: (row.paid_at as string | null) ?? null,
  };
}

const COMMISSION_ENTRY_SELECT = `
  id,
  client_id,
  setter_id,
  closer_id,
  project_value_cents,
  setter_rate,
  closer_rate,
  setter_commission_cents,
  closer_commission_cents,
  status,
  triggered_by_invoice_id,
  created_at,
  updated_at,
  paid_at,
  client:clients!commission_entries_client_id_fkey(company_name),
  setter:profiles!commission_entries_setter_id_fkey(full_name, email),
  closer:profiles!commission_entries_closer_id_fkey(full_name, email)
`;

function computeCenterStats(entries: CommissionEntryRecord[]): CommissionCenterStats {
  return entries.reduce(
    (stats, entry) => {
      const total =
        entry.setter_commission_cents + entry.closer_commission_cents;

      if (entry.status === "pending") stats.pendingCents += total;
      if (entry.status === "approved") stats.approvedCents += total;
      if (entry.status === "paid") stats.paidCents += total;
      if (entry.status !== "cancelled") stats.totalCostCents += total;

      return stats;
    },
    { pendingCents: 0, approvedCents: 0, paidCents: 0, totalCostCents: 0 },
  );
}

export async function getCommissionEntries(): Promise<CommissionEntryRecord[]> {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("commission_entries")
    .select(COMMISSION_ENTRY_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    if (isCommissionCenterSchemaMissingError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    mapCommissionEntryRow(row as Record<string, unknown>),
  );
}

export async function getCommissionCenterData(): Promise<CommissionCenterData> {
  const profile = await getProfile();
  if (!profile || !canManageCommissions(profile)) {
    throw new Error("Keine Berechtigung");
  }

  const entries = await getCommissionEntries();
  return {
    entries,
    stats: computeCenterStats(entries),
  };
}

export async function getMemberCommissionSummary(
  profileId: string,
): Promise<MemberCommissionSummary | null> {
  const actor = await getProfile();
  if (!actor) return null;

  const canView =
    isManagement(actor) ||
    canManageCommissions(actor) ||
    actor.id === profileId;
  if (!canView) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("commission_entries")
    .select(COMMISSION_ENTRY_SELECT)
    .or(`setter_id.eq.${profileId},closer_id.eq.${profileId}`)
    .order("created_at", { ascending: false });

  if (error) {
    if (isCommissionCenterSchemaMissingError(error.message)) return null;
    throw new Error(error.message);
  }

  const entries = (data ?? []).map((row) =>
    mapCommissionEntryRow(row as Record<string, unknown>),
  );

  const { data: payouts, error: payoutError } = await supabase
    .from("commission_payouts")
    .select("amount_cents")
    .eq("profile_id", profileId);

  if (payoutError && !isCommissionCenterSchemaMissingError(payoutError.message)) {
    throw new Error(payoutError.message);
  }

  const paidCents = (payouts ?? []).reduce(
    (sum, payout) => sum + Number(payout.amount_cents ?? 0),
    0,
  );

  const earnedCents = sumMemberCommissionEarned(entries, profileId);
  const openCents = sumMemberCommissionOpen(entries, profileId);

  return {
    earnedCents,
    paidCents,
    openCents,
    entries,
  };
}

export async function getCommissionDashboardKpis(): Promise<CommissionDashboardKpis | null> {
  const profile = await getProfile();
  if (!profile || !isManagement(profile)) return null;

  const entries = await getCommissionEntries();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  let openCents = 0;
  let monthCents = 0;
  let yearCents = 0;
  const setterTotals = new Map<string, { name: string; amountCents: number }>();
  const closerTotals = new Map<string, { name: string; amountCents: number }>();

  for (const entry of entries) {
    const total =
      entry.setter_commission_cents + entry.closer_commission_cents;
    const createdAt = new Date(entry.created_at);

    if (entry.status === "pending" || entry.status === "approved") {
      openCents += total;
    }

    if (entry.status !== "cancelled") {
      if (createdAt >= monthStart) monthCents += total;
      if (createdAt >= yearStart) yearCents += total;
    }

    if (entry.setter_id && entry.setter_commission_cents > 0) {
      const current = setterTotals.get(entry.setter_id) ?? {
        name: entry.setter_name ?? "Setter",
        amountCents: 0,
      };
      current.amountCents += entry.setter_commission_cents;
      setterTotals.set(entry.setter_id, current);
    }

    if (entry.closer_id && entry.closer_commission_cents > 0) {
      const current = closerTotals.get(entry.closer_id) ?? {
        name: entry.closer_name ?? "Closer",
        amountCents: 0,
      };
      current.amountCents += entry.closer_commission_cents;
      closerTotals.set(entry.closer_id, current);
    }
  }

  const topSetters = [...setterTotals.entries()]
    .map(([profileId, value]) => ({ profileId, ...value }))
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 3);

  const topClosers = [...closerTotals.entries()]
    .map(([profileId, value]) => ({ profileId, ...value }))
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 3);

  return {
    openCents,
    monthCents,
    yearCents,
    topSetters,
    topClosers,
  };
}

export function memberHasCommissionTab(member: {
  agency_role: string;
}): boolean {
  return (
    member.agency_role === "setter" ||
    member.agency_role === "closer" ||
    member.agency_role === "sales_manager"
  );
}

export async function canViewMemberCommissions(
  actorId: string,
  memberId: string,
  memberRole: string,
): Promise<boolean> {
  const profile = await getProfile();
  if (!profile) return false;
  if (isManagement(profile) || canManageCommissions(profile)) return true;
  if (profile.id !== memberId) return false;
  return isSetter(profile) || isCloser(profile) || memberHasCommissionTab({ agency_role: memberRole });
}
