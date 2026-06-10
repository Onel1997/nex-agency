import { getProfile, isAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { TeamMember } from "./types";

export async function getTeamMembers(): Promise<TeamMember[]> {
  const profile = await getProfile();
  if (!profile || !isAdmin(profile)) {
    throw new Error("Keine Berechtigung");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at, is_active, status")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as TeamMember[];
}

export async function getAssignableTeamMembers(): Promise<TeamMember[]> {
  const profile = await getProfile();
  if (!profile) return [];

  const supabase = await createClient();

  if (isAdmin(profile)) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at, is_active, status")
      .eq("status", "active")
      .order("full_name");

    if (error) throw new Error(error.message);
    return (data ?? []) as TeamMember[];
  }

  return [
    {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      status: profile.status,
      created_at: profile.created_at,
      is_active: profile.is_active,
    },
  ];
}

export async function getActiveTeamCount(): Promise<number> {
  const profile = await getProfile();
  if (!profile || !isAdmin(profile)) return 0;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  if (error) throw new Error(error.message);
  return count ?? 0;
}
