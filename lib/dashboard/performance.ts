import { canAccessFinanceRoutes } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { TeamPerformanceStats } from "./types";

function calculateCommissionCents(
  revenueCents: number,
  rate: number,
): number {
  if (revenueCents <= 0 || rate <= 0) return 0;
  return Math.round((revenueCents * rate) / 100);
}

export async function getTeamPerformanceStats(): Promise<TeamPerformanceStats[] | null> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) return null;

  const supabase = await createClient();

  const [{ data: profiles, error: profilesError }, { data: leads, error: leadsError }, { data: clients, error: clientsError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, role, commission_rate")
        .eq("status", "active")
        .not("activated_at", "is", null)
        .order("full_name"),
      supabase.from("leads").select("owner_id, created_by, status"),
      supabase
        .from("clients")
        .select(
          "responsible_member_id, total_revenue_cents, commission_status, responsible_member:profiles!clients_responsible_member_id_fkey(commission_rate)",
        ),
    ]);

  if (profilesError) throw new Error(profilesError.message);
  if (leadsError) throw new Error(leadsError.message);
  if (clientsError) throw new Error(clientsError.message);

  const statsByUser = new Map<
    string,
    {
      leadsCreated: number;
      leadsWon: number;
      clientsOwned: number;
      revenueGeneratedCents: number;
      commissionsEarnedCents: number;
    }
  >();

  for (const lead of leads ?? []) {
    if (lead.created_by) {
      const current = statsByUser.get(lead.created_by) ?? emptyStats();
      current.leadsCreated += 1;
      statsByUser.set(lead.created_by, current);
    }

    if (lead.owner_id && lead.status === "client") {
      const current = statsByUser.get(lead.owner_id) ?? emptyStats();
      current.leadsWon += 1;
      statsByUser.set(lead.owner_id, current);
    }
  }

  for (const client of clients ?? []) {
    if (!client.responsible_member_id) continue;

    const member = Array.isArray(client.responsible_member)
      ? client.responsible_member[0]
      : client.responsible_member;

    const rate =
      (member as { commission_rate: number } | null)?.commission_rate ?? 0;
    const revenue = client.total_revenue_cents ?? 0;
    const commission = calculateCommissionCents(revenue, rate);

    const current = statsByUser.get(client.responsible_member_id) ?? emptyStats();
    current.clientsOwned += 1;
    current.revenueGeneratedCents += revenue;

    if (
      client.commission_status === "paid" ||
      client.commission_status === "outstanding"
    ) {
      current.commissionsEarnedCents += commission;
    }

    statsByUser.set(client.responsible_member_id, current);
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
      revenueGeneratedCents: counts.revenueGeneratedCents,
      commissionsEarnedCents: counts.commissionsEarnedCents,
    };
  });
}

function emptyStats() {
  return {
    leadsCreated: 0,
    leadsWon: 0,
    clientsOwned: 0,
    revenueGeneratedCents: 0,
    commissionsEarnedCents: 0,
  };
}
