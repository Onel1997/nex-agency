import { redirect } from "next/navigation";
import type { Profile } from "@/lib/auth/types";
import {
  canAccessFinanceRoutes,
  canAccessPerformanceRoutes,
  isManagement as checkManagement,
  isSuperAdmin as checkSuperAdmin,
} from "@/lib/auth/permissions";
import { hasCompletedInvitation } from "@/lib/auth/member-status";
import { SET_PASSWORD_PATH } from "@/lib/auth/password-setup";
import { normalizeUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase.rpc("get_current_profile");

  if (error || !data) return null;

  const profile = data as Profile;
  const normalizedRole = normalizeUserRole(profile.role);
  if (!normalizedRole) return profile;

  return normalizedRole === profile.role
    ? profile
    : { ...profile, role: normalizedRole };
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.status === "deactivated" || !profile.is_active) {
    redirect("/login?error=account_deactivated");
  }
  if (!hasCompletedInvitation(profile)) {
    redirect(SET_PASSWORD_PATH);
  }
  return profile;
}

export async function requireManagement(): Promise<Profile> {
  const profile = await requireProfile();
  if (!checkManagement(profile)) redirect("/dashboard");
  return profile;
}

export async function requireFinanceAccess(): Promise<Profile> {
  const profile = await requireProfile();
  if (!canAccessFinanceRoutes(profile)) redirect("/dashboard");
  return profile;
}

export async function requirePerformanceAccess(): Promise<Profile> {
  const profile = await requireProfile();
  if (!canAccessPerformanceRoutes(profile)) redirect("/dashboard");
  return profile;
}

/** @deprecated Use requireManagement() */
export async function requireAdmin(): Promise<Profile> {
  return requireManagement();
}

export async function requireSuperAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (!checkSuperAdmin(profile)) redirect("/dashboard");
  return profile;
}

export function isManagement(profile: Profile): boolean {
  return checkManagement(profile);
}

/** @deprecated Use isManagement() */
export function isAdmin(profile: Profile): boolean {
  return checkManagement(profile);
}

export function isSuperAdmin(profile: Profile): boolean {
  return checkSuperAdmin(profile);
}
