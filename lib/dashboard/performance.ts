import { canAccessFinanceRoutes } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  fetchPerformanceClientRows,
  fetchRetainerPayments,
  groupPaymentsByClient,
} from "./retainer-data";
import { syncCommissionAmounts } from "./commission";
import { buildRetainerStats } from "./retainer";
import type { TeamPerformanceStats } from "./types";

export async function getTeamPerformanceStats(): Promise<TeamPerformanceStats[] | null> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) return null;

  const supabase = await createClient();

  const [
    { data: profiles, error: profilesError },
    { data: leads, error: leadsError },
    { rows: clients },
    payments,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, commission_rate")
      .eq("status", "active")
      .not("activated_at", "is", null)
      .order("full_name"),
    supabase.from("leads").select("owner_id, created_by, status"),
    fetchPerformanceClientRows(supabase),
    fetchRetainerPayments(supabase),
  ]);

  if (profilesError) throw new Error(profilesError.message);
  if (leadsError) throw new Error(leadsError.message);

  const paymentsByClient = groupPaymentsByClient(payments);

  const statsByUser = new Map<
    string,
    {
      leadsCreated: number;
      leadsWon: number;
      clientsOwned: number;
      setupRevenueCents: number;
      retainerRevenueCents: number;
      revenueGeneratedCents: number;
      commissionsTotalCents: number;
      commissionsPaidCents: number;
      commissionsOutstandingCents: number;
    }
  >();

  for (const lead of leads ?? []) {
    if (lead.created_by) {
      const current = statsByUser.get(lead.created_by) ?? emptyStats();
      current.leadsCreated += 1;
      statsByUser.set(lead.created_by, current);
    }

    if (lead.owner_id && lead.status === "won") {
      const current = statsByUser.get(lead.owner_id) ?? emptyStats();
      current.leadsWon += 1;
      statsByUser.set(lead.owner_id, current);
    }
  }

  for (const clientRow of clients) {
    const client = clientRow as Record<string, unknown>;
    const responsibleMemberId = client.responsible_member_id as string | null;
    if (!responsibleMemberId) continue;

    const member = Array.isArray(client.responsible_member)
      ? client.responsible_member[0]
      : client.responsible_member;

    const rate =
      (member as { commission_rate: number } | null)?.commission_rate ?? 0;
    const clientId = client.id as string;
    const clientPayments = paymentsByClient.get(clientId) ?? [];
    const retainerStats = buildRetainerStats({
      contract_start_date: (client.contract_start_date as string | null) ?? null,
      setup_fee_cents: (client.setup_fee_cents as number | null) ?? null,
      monthly_revenue_cents: (client.monthly_revenue_cents as number | null) ?? null,
      payments: clientPayments,
    });
    const revenue = retainerStats.total_revenue_cents;
    const setupFeeCents = (client.setup_fee_cents as number | null) ?? null;
    const hasCommissionSchema = client.commission_total_cents !== undefined;
    const commission = hasCommissionSchema
      ? {
          commission_total_cents: (client.commission_total_cents as number) ?? 0,
          commission_paid_cents: (client.commission_paid_cents as number) ?? 0,
          commission_outstanding_cents:
            (client.commission_outstanding_cents as number) ?? 0,
        }
      : syncCommissionAmounts({
          setupFeeCents,
          commissionRate: rate,
          currentTotalCents: 0,
          currentPaidCents: 0,
        });

    const current = statsByUser.get(responsibleMemberId) ?? emptyStats();
    current.clientsOwned += 1;
    current.setupRevenueCents += retainerStats.setup_revenue_cents;
    current.retainerRevenueCents += retainerStats.retainer_revenue_cents;
    current.revenueGeneratedCents += revenue;
    current.commissionsTotalCents += commission.commission_total_cents;
    current.commissionsPaidCents += commission.commission_paid_cents;
    current.commissionsOutstandingCents +=
      commission.commission_outstanding_cents;

    statsByUser.set(responsibleMemberId, current);
  }

  return (profiles ?? []).map((member) => {
    const counts = statsByUser.get(member.id) ?? emptyStats();

    return {
      userId: member.id,
      fullName: member.full_name?.trim() || member.email.split("@")[0],
      email: member.email,
      role: member.role,
      commissionRate: Number(member.commission_rate ?? 0),
      leadsCreated: counts.leadsCreated,
      leadsWon: counts.leadsWon,
      clientsOwned: counts.clientsOwned,
      setupRevenueCents: counts.setupRevenueCents,
      retainerRevenueCents: counts.retainerRevenueCents,
      revenueGeneratedCents: counts.revenueGeneratedCents,
      commissionsTotalCents: counts.commissionsTotalCents,
      commissionsPaidCents: counts.commissionsPaidCents,
      commissionsOutstandingCents: counts.commissionsOutstandingCents,
    };
  });
}

function emptyStats() {
  return {
    leadsCreated: 0,
    leadsWon: 0,
    clientsOwned: 0,
    setupRevenueCents: 0,
    retainerRevenueCents: 0,
    revenueGeneratedCents: 0,
    commissionsTotalCents: 0,
    commissionsPaidCents: 0,
    commissionsOutstandingCents: 0,
  };
}
