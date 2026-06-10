import type { TeamMemberStatus } from "@/lib/auth/types";

export function hasCompletedInvitation(profile: {
  status: TeamMemberStatus;
  activated_at: string | null;
}): boolean {
  return profile.activated_at !== null;
}

export function resolveTeamMemberStatus(member: {
  status: TeamMemberStatus;
  activated_at: string | null;
}): TeamMemberStatus {
  if (member.status === "deactivated") {
    return "deactivated";
  }

  if (!hasCompletedInvitation(member)) {
    return "pending";
  }

  return "active";
}
