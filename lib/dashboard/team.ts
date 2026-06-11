import { isManagement } from "@/lib/auth/permissions";
import { normalizeUserRole } from "@/lib/auth/roles";
import { getProfile } from "@/lib/auth/session";
import { resolveTeamMemberStatus } from "@/lib/auth/member-status";
import { createClient } from "@/lib/supabase/server";
import type { TeamMember } from "./types";

function mapTeamMember(
  row: Omit<TeamMember, "status" | "role"> & {
    status: TeamMember["status"];
    role: string;
    commission_rate?: number;
  },
): TeamMember {
  const normalizedRole = normalizeUserRole(row.role) ?? "employee";
  return {
    ...row,
    role: normalizedRole,
    commission_rate: Number(row.commission_rate ?? 10),
    status: resolveTeamMemberStatus(row),
  };
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const profile = await getProfile();
  if (!profile || !isManagement(profile)) {
    throw new Error("Keine Berechtigung");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at, is_active, status, activated_at, commission_rate")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapTeamMember(row as TeamMember));
}

export async function getAssignableTeamMembers(): Promise<TeamMember[]> {
  const profile = await getProfile();
  if (!profile) return [];

  const supabase = await createClient();

  if (isManagement(profile)) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at, is_active, status, activated_at, commission_rate")
      .eq("status", "active")
      .not("activated_at", "is", null)
      .order("full_name");

    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapTeamMember(row as TeamMember));
  }

  return [
    mapTeamMember({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      status: profile.status,
      created_at: profile.created_at,
      is_active: profile.is_active,
      activated_at: profile.activated_at,
      commission_rate: profile.commission_rate,
    }),
  ];
}

export async function getActiveTeamCount(): Promise<number> {
  const profile = await getProfile();
  if (!profile || !isManagement(profile)) return 0;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .not("activated_at", "is", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}
