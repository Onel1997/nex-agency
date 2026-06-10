import { redirect } from "next/navigation";
import type { Profile } from "@/lib/auth/types";
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
  return data as Profile;
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.status === "pending") {
    redirect("/login?error=invitation_pending");
  }
  if (profile.status === "deactivated" || !profile.is_active) {
    redirect("/login?error=account_deactivated");
  }
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (!isAdmin(profile)) redirect("/dashboard");
  return profile;
}

export function isAdmin(profile: Profile): boolean {
  return profile.role === "admin";
}
