import { agencyRoleFromLegacyRole, normalizeAgencyRole } from "@/lib/auth/roles";
import { isSetter, type PermissionActor } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type LeadSetterSource = {
  setter_id?: string | null;
  created_by?: string | null;
  owner_id?: string | null;
};

export async function isProfileAgencySetter(
  supabase: SupabaseClient,
  profileId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("agency_role, role")
    .eq("id", profileId)
    .maybeSingle();

  if (!data) return false;

  const role =
    normalizeAgencyRole(data.agency_role) ??
    agencyRoleFromLegacyRole(data.role as UserRole);

  return role === "setter";
}

/** Resolve setter_id for new leads or when attribution is still empty. */
export async function resolveLeadSetterId(
  supabase: SupabaseClient,
  input: {
    actorProfile: PermissionActor & Pick<{ id: string }, "id">;
    ownerId: string | null;
    existingSetterId?: string | null;
    createdById?: string | null;
  },
): Promise<string | null> {
  if (input.existingSetterId) {
    return input.existingSetterId;
  }

  if (isSetter(input.actorProfile)) {
    return input.actorProfile.id;
  }

  if (input.createdById && (await isProfileAgencySetter(supabase, input.createdById))) {
    return input.createdById;
  }

  if (input.ownerId && (await isProfileAgencySetter(supabase, input.ownerId))) {
    return input.ownerId;
  }

  return null;
}

/** Recover setter attribution from persisted lead fields before client conversion. */
export async function resolveLeadSetterIdForPersistence(
  supabase: SupabaseClient,
  lead: LeadSetterSource,
): Promise<string | null> {
  if (lead.setter_id) {
    return lead.setter_id;
  }

  if (lead.created_by && (await isProfileAgencySetter(supabase, lead.created_by))) {
    return lead.created_by;
  }

  if (lead.owner_id && (await isProfileAgencySetter(supabase, lead.owner_id))) {
    return lead.owner_id;
  }

  return null;
}
