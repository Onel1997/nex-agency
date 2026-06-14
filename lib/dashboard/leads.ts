import { isManagement } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAppointmentCount, getTeamAppointmentCounts } from "./appointments";
import { getActiveTeamCount } from "./team";
import { PIPELINE_STATUSES } from "./constants";
import type { DashboardStats, Lead, TeamMemberStats } from "./types";

function formatMemberName(
  member: { full_name: string | null; email: string } | null | undefined,
): string | null {
  if (!member) return null;
  return member.full_name?.trim() || member.email.split("@")[0];
}

function mapLeadRow(row: Record<string, unknown>): Lead {
  const owner = Array.isArray(row.owner) ? row.owner[0] : row.owner;
  const creator = Array.isArray(row.creator) ? row.creator[0] : row.creator;

  return {
    ...(row as unknown as Lead),
    converted_to_client: Boolean(row.converted_to_client),
    setter_id: (row.setter_id as string | null) ?? null,
    closer_id: (row.closer_id as string | null) ?? null,
    owner_name: formatMemberName(
      owner as { full_name: string | null; email: string } | null,
    ),
    creator_name: formatMemberName(
      creator as { full_name: string | null; email: string } | null,
    ),
  };
}

const LEAD_SELECT = `
  *,
  owner:profiles!leads_owner_id_fkey(full_name, email),
  creator:profiles!leads_created_by_fkey(full_name, email)
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

export async function getRecentLeads(limit = 5): Promise<Lead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

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
  const managementView = profile ? isManagement(profile) : false;

  const supabase = await createClient();
  let clientsQuery = supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .eq("is_archived", false)
    .is("deleted_at", null);

  let { count: clientCount, error: clientsError } = await clientsQuery;

  if (clientsError && clientsError.message.toLowerCase().includes("deleted_at")) {
    ({ count: clientCount, error: clientsError } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("is_archived", false));
  }

  if (clientsError && clientsError.message.toLowerCase().includes("is_archived")) {
    ({ count: clientCount, error: clientsError } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true }));
  }

  const [{ data: leadRows, error: leadsError }] = await Promise.all([
    supabase.from("leads").select("status, estimated_value_cents"),
  ]);

  if (leadsError) throw new Error(leadsError.message);
  if (clientsError) throw new Error(clientsError.message);

  const rows = leadRows ?? [];
  const pipelineRows = rows.filter((r) => PIPELINE_STATUSES.includes(r.status));

  const stats: DashboardStats = {
    leadsCount: rows.length,
    appointmentsCount: await getAppointmentCount(),
    clientsCount: clientCount ?? 0,
    pipelineCount: pipelineRows.length,
    pipelineValueCents: pipelineRows.reduce(
      (sum, row) => sum + (row.estimated_value_cents ?? 0),
      0,
    ),
  };

  if (managementView) {
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
  if (!profile || !isManagement(profile)) return null;

  const supabase = await createClient();

  const [{ data: profiles, error: profilesError }, { data: leads, error: leadsError }, appointmentCounts] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("status", "active")
        .order("full_name"),
      supabase
        .from("leads")
        .select("owner_id, status, estimated_value_cents, converted_to_client"),
      getTeamAppointmentCounts(),
    ]);

  if (profilesError) throw new Error(profilesError.message);
  if (leadsError) throw new Error(leadsError.message);

  const leadRows = leads ?? [];
  const countsByUser = new Map<
    string,
    { leads: number; appointments: number; clients: number; pipelineValueCents: number }
  >();

  for (const lead of leadRows) {
    if (!lead.owner_id) continue;
    const current = countsByUser.get(lead.owner_id) ?? {
      leads: 0,
      appointments: 0,
      clients: 0,
      pipelineValueCents: 0,
    };
    current.leads += 1;
    if (lead.converted_to_client) current.clients += 1;
    if (PIPELINE_STATUSES.includes(lead.status)) {
      current.pipelineValueCents += lead.estimated_value_cents ?? 0;
    }
    countsByUser.set(lead.owner_id, current);
  }

  return (profiles ?? []).map((member) => {
    const counts = countsByUser.get(member.id) ?? {
      leads: 0,
      appointments: 0,
      clients: 0,
      pipelineValueCents: 0,
    };

    return {
      userId: member.id,
      fullName: member.full_name?.trim() || member.email.split("@")[0],
      email: member.email,
      role: member.role,
      leadsCount: counts.leads,
      appointmentsCount: appointmentCounts.get(member.id) ?? 0,
      clientsCount: counts.clients,
      pipelineValueCents: counts.pipelineValueCents,
    };
  });
}
