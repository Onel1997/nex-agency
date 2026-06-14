import { LeadsPageClient } from "@/components/dashboard/LeadsPageClient";
import { canAssignLeadOwner, canConvertLeadToClient, canMarkLeadWon, isManagement } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { getLeads } from "@/lib/dashboard/leads";
import { getAssignableTeamMembers } from "@/lib/dashboard/team";
import type { Lead } from "@/lib/dashboard/types";

export default async function LeadsPage() {
  const profile = await getProfile();
  let leads: Lead[] = [];
  const teamMembers = profile ? await getAssignableTeamMembers() : [];
  let error: string | null = null;

  try {
    leads = await getLeads();
  } catch (err) {
    error = err instanceof Error ? err.message : "Leads konnten nicht geladen werden";
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
        {error}
      </div>
    );
  }

  if (!profile) return null;

  const managementView = isManagement(profile);

  return (
    <LeadsPageClient
      leads={leads}
      canAssign={canAssignLeadOwner(profile)}
      canMarkLeadWon={canMarkLeadWon(profile)}
      canConvertLead={canConvertLeadToClient(profile)}
      showOwnership={managementView}
      teamMembers={teamMembers}
      currentUserId={profile.id}
    />
  );
}
