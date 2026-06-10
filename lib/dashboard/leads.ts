import { getProfile, isAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAppointmentCount, getTeamAppointmentCounts } from "./appointments";
import { getActiveTeamCount } from "./team";
import { PIPELINE_STATUSES } from "./constants";
import type { DashboardStats, Lead, TeamMemberStats } from "./types";

function formatAssignee(
  assignee: { full_name: string | null; email: string } | null | undefined,
): string | null {
  if (!assignee) return null;
  return assignee.full_name?.trim() || assignee.email.split("@")[0];
}

function mapLeadRow(row: Record<string, unknown>): Lead {
  const assignee = Array.isArray(row.assignee) ? row.assignee[0] : row.assignee;
  return {
    ...(row as unknown as Lead),
    assignee_name: formatAssignee(
      assignee as { full_name: string | null; email: string } | null,
    ),
  };
}

const LEAD_SELECT = `
  *,
  assignee:profiles!leads_assigned_to_fkey(full_name, email)
`;

export async function getLeads(): Promise<Lead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapLeadRow(row as Record<string, unknown>));
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapLeadRow(data as Record<string, unknown>);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const profile = await getProfile();
  const adminView = profile ? isAdmin(profile) : false;

  const supabase = await createClient();
  const { data, error } = await supabase.from("leads").select("status");

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const stats: DashboardStats = {
    leadsCount: rows.length,
    appointmentsCount: await getAppointmentCount(),
    clientsCount: rows.filter((r) => r.status === "client").length,
    pipelineCount: rows.filter((r) =>
      PIPELINE_STATUSES.includes(r.status),
    ).length,
  };

  if (adminView) {
    stats.teamCount = await getActiveTeamCount();
  }

  return stats;
}

export async function getLeadsByStatus(status: string): Promise<Lead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapLeadRow(row as Record<string, unknown>));
}

export async function getTeamStats(): Promise<TeamMemberStats[] | null> {
  const profile = await getProfile();
  if (!profile || !isAdmin(profile)) return null;

  const supabase = await createClient();

  const [{ data: profiles, error: profilesError }, { data: leads, error: leadsError }, appointmentCounts] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("status", "active")
        .order("full_name"),
      supabase.from("leads").select("assigned_to, status"),
      getTeamAppointmentCounts(),
    ]);

  if (profilesError) throw new Error(profilesError.message);
  if (leadsError) throw new Error(leadsError.message);

  const leadRows = leads ?? [];
  const countsByUser = new Map<
    string,
    { leads: number; appointments: number; clients: number }
  >();

  for (const lead of leadRows) {
    if (!lead.assigned_to) continue;
    const current = countsByUser.get(lead.assigned_to) ?? {
      leads: 0,
      appointments: 0,
      clients: 0,
    };
    current.leads += 1;
    if (lead.status === "client") current.clients += 1;
    countsByUser.set(lead.assigned_to, current);
  }

  return (profiles ?? []).map((member) => {
    const counts = countsByUser.get(member.id) ?? {
      leads: 0,
      appointments: 0,
      clients: 0,
    };

    return {
      userId: member.id,
      fullName: member.full_name?.trim() || member.email.split("@")[0],
      email: member.email,
      role: member.role,
      leadsCount: counts.leads,
      appointmentsCount: appointmentCounts.get(member.id) ?? 0,
      clientsCount: counts.clients,
    };
  });
}
