import { canAccessFinanceRoutes } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import type { CommissionStatus } from "@/lib/dashboard/constants";
import { createClient } from "@/lib/supabase/server";
import type { ClientRevenueRecord, FinanceStats } from "./types";

function formatMemberName(
  member: { full_name: string | null; email: string } | null | undefined,
): string | null {
  if (!member) return null;
  return member.full_name?.trim() || member.email.split("@")[0];
}

function calculateCommissionCents(
  revenueCents: number | null,
  rate: number | null,
): number {
  if (!revenueCents || revenueCents <= 0 || !rate || rate <= 0) return 0;
  return Math.round((revenueCents * rate) / 100);
}

const CLIENT_REVENUE_SELECT = `
  id,
  company_name,
  responsible_member_id,
  monthly_revenue_cents,
  setup_fee_cents,
  total_revenue_cents,
  commission_status,
  currency,
  responsible_member:profiles!clients_responsible_member_id_fkey(
    full_name,
    email,
    commission_rate
  )
`;

function mapClientRevenueRow(row: Record<string, unknown>): ClientRevenueRecord {
  const responsibleMember = Array.isArray(row.responsible_member)
    ? row.responsible_member[0]
    : row.responsible_member;

  const member = responsibleMember as {
    full_name: string | null;
    email: string;
    commission_rate: number;
  } | null;

  const commissionRate = member?.commission_rate ?? 0;
  const totalRevenue = (row.total_revenue_cents as number | null) ?? null;

  return {
    id: row.id as string,
    company_name: row.company_name as string,
    responsible_member_id: (row.responsible_member_id as string | null) ?? null,
    responsible_member_name: formatMemberName(member),
    monthly_revenue_cents: (row.monthly_revenue_cents as number | null) ?? null,
    setup_fee_cents: (row.setup_fee_cents as number | null) ?? null,
    total_revenue_cents: totalRevenue,
    commission_status: row.commission_status as CommissionStatus,
    commission_rate: commissionRate,
    commission_cents: calculateCommissionCents(totalRevenue, commissionRate),
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

  for (const client of clients) {
    totalRevenueCents += client.total_revenue_cents ?? 0;
    monthlyRecurringRevenueCents += client.monthly_revenue_cents ?? 0;

    if (client.commission_status === "outstanding" || client.commission_status === "pending") {
      outstandingCommissionsCents += client.commission_cents;
    }

    if (client.commission_status === "paid") {
      paidCommissionsCents += client.commission_cents;
    }
  }

  return {
    totalRevenueCents,
    monthlyRecurringRevenueCents,
    outstandingCommissionsCents,
    paidCommissionsCents,
  };
}

export async function getClientRevenueRecords(): Promise<ClientRevenueRecord[]> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) {
    throw new Error("Keine Berechtigung");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_REVENUE_SELECT)
    .order("company_name");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) =>
    mapClientRevenueRow(row as Record<string, unknown>),
  );
}

export function computeTotalRevenueCents(
  setupFeeCents: number | null,
  monthlyRevenueCents: number | null,
  contractValueCents?: number | null,
): number | null {
  const setup = setupFeeCents ?? 0;
  const recurring =
    contractValueCents && contractValueCents > 0
      ? contractValueCents
      : (monthlyRevenueCents ?? 0) * 12;

  if (setup === 0 && recurring === 0) return null;
  return setup + recurring;
}
