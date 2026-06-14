import { ClientsPageClient } from "@/components/dashboard/ClientsPageClient";
import { canAssignLeadOwner } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { getClients } from "@/lib/dashboard/clients";
import { getClientWorkflowStatusMap } from "@/lib/dashboard/workflow-stats";
import { getAssignableTeamMembers } from "@/lib/dashboard/team";
import type { ClientRecord } from "@/lib/dashboard/types";
import type { CustomerWorkflowStage, WorkflowStatus } from "@/lib/dashboard/workflow-status";

export default async function ClientsPage() {
  const profile = await getProfile();
  let clients: ClientRecord[] = [];
  let clientWorkflowById: Record<string, WorkflowStatus<CustomerWorkflowStage>> = {};
  let error: string | null = null;

  try {
    const [loadedClients, workflowMap] = await Promise.all([
      getClients(),
      getClientWorkflowStatusMap(),
    ]);
    clients = loadedClients;
    clientWorkflowById = Object.fromEntries(workflowMap.entries());
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Kunden konnten nicht geladen werden";
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
        {error}
      </div>
    );
  }

  if (!profile) return null;

  return (
    <ClientsPageClient
      clients={clients}
      profile={profile}
      canAssign={canAssignLeadOwner(profile)}
      teamMembers={await getAssignableTeamMembers()}
      clientWorkflowById={clientWorkflowById}
    />
  );
}
