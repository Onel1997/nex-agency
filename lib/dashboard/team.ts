import { isManagement } from "@/lib/auth/permissions";
import {
  agencyRoleFromLegacyRole,
  normalizeAgencyRole,
  normalizeEmploymentType,
  normalizeUserRole,
} from "@/lib/auth/roles";
import { getProfile } from "@/lib/auth/session";
import { resolveTeamMemberStatus } from "@/lib/auth/member-status";
import {
  DEFAULT_RETAINER_COMMISSION_MONTHS,
  DEFAULT_RETAINER_COMMISSION_RATE,
} from "./commission-constants";
import { createClient } from "@/lib/supabase/server";
import type { TeamMember } from "./types";

const TEAM_MEMBER_SELECT =
  "id, email, full_name, role, employment_type, agency_role, created_at, is_active, status, activated_at, commission_rate, setter_commission_rate, closer_commission_rate, retainer_commission_rate, retainer_commission_months";

function mapTeamMember(
  row: Omit<TeamMember, "status" | "role" | "agency_role" | "employment_type"> & {
    status: TeamMember["status"];
    role: string;
    agency_role?: string | null;
    employment_type?: string | null;
    commission_rate?: number;
    setter_commission_rate?: number;
    closer_commission_rate?: number;
  },
): TeamMember {
  const normalizedRole = normalizeUserRole(row.role) ?? "employee";
  const agencyRole =
    normalizeAgencyRole(row.agency_role) ?? agencyRoleFromLegacyRole(row.role);
  const employmentType =
    normalizeEmploymentType(row.employment_type) ??
    (normalizedRole === "freelancer" ? "freelancer" : "employee");

  return {
    ...row,
    role: normalizedRole,
    agency_role: agencyRole,
    employment_type: employmentType,
    commission_rate: Number(row.commission_rate ?? 10),
    setter_commission_rate: Number(row.setter_commission_rate ?? 0),
    closer_commission_rate: Number(
      row.closer_commission_rate ?? row.commission_rate ?? 0,
    ),
    retainer_commission_rate: Number(
      row.retainer_commission_rate ?? DEFAULT_RETAINER_COMMISSION_RATE,
    ),
    retainer_commission_months: Number(
      row.retainer_commission_months ?? DEFAULT_RETAINER_COMMISSION_MONTHS,
    ),
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
    .select(TEAM_MEMBER_SELECT)
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
      .select(TEAM_MEMBER_SELECT)
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
      agency_role: profile.agency_role,
      employment_type: profile.employment_type,
      status: profile.status,
      created_at: profile.created_at,
      is_active: profile.is_active,
      activated_at: profile.activated_at,
      commission_rate: profile.commission_rate,
      setter_commission_rate: profile.setter_commission_rate,
      closer_commission_rate: profile.closer_commission_rate,
      retainer_commission_rate: profile.retainer_commission_rate,
      retainer_commission_months: profile.retainer_commission_months,
    }),
  ];
}

export async function getAssignableFreelancers(): Promise<TeamMember[]> {
  const profile = await getProfile();
  if (!profile || !isManagement(profile)) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(TEAM_MEMBER_SELECT)
    .eq("employment_type", "freelancer")
    .eq("status", "active")
    .not("activated_at", "is", null)
    .order("full_name");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapTeamMember(row as TeamMember));
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
