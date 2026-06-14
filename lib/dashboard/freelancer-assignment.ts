import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEmploymentType } from "@/lib/auth/roles";
import type { TeamMember } from "./types";

export const FREELANCER_EMPLOYMENT_TYPE = "freelancer" as const;

export function isAssignableFreelancer(
  member: Pick<TeamMember, "employment_type" | "status" | "activated_at">,
): boolean {
  const employmentType = normalizeEmploymentType(member.employment_type);
  return (
    employmentType === FREELANCER_EMPLOYMENT_TYPE &&
    member.status === "active" &&
    member.activated_at != null
  );
}

export function filterAssignableFreelancers(members: TeamMember[]): TeamMember[] {
  return members.filter(isAssignableFreelancer);
}

export async function assertAssignableFreelancerId(
  supabase: SupabaseClient,
  profileId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .select("employment_type, status, activated_at")
    .eq("id", profileId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Freelancer nicht gefunden");

  if (!isAssignableFreelancer(data as TeamMember)) {
    throw new Error("Nur aktive Freelancer können zugewiesen werden");
  }
}
