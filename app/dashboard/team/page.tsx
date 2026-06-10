import { requireManagement } from "@/lib/auth/session";
import { getTeamMembers } from "@/lib/dashboard/team";
import type { TeamMember } from "@/lib/dashboard/types";
import { TeamPageClient } from "@/components/dashboard/TeamPageClient";

export default async function TeamPage() {
  const profile = await requireManagement();
  let members: TeamMember[] = [];
  let error: string | null = null;

  try {
    members = await getTeamMembers();
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Team konnte nicht geladen werden";
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
        {error}
      </div>
    );
  }

  return (
    <TeamPageClient
      members={members}
      currentUserId={profile.id}
      currentUserRole={profile.role}
    />
  );
}
