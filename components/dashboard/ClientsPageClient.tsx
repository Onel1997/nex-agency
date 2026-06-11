"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Users } from "lucide-react";
import { updateClient } from "@/app/dashboard/clients/actions";
import { DashboardHeader } from "./DashboardHeader";
import { DataTable } from "./DataTable";
import { EmptyState } from "./EmptyState";
import { ClientModal } from "./ClientModal";
import type { ClientFormData } from "./ClientForm";
import { formatCents, formatDate } from "@/lib/dashboard/format";
import type { Profile } from "@/lib/auth/types";
import { canEditClientRevenue } from "@/lib/auth/permissions";
import type { ClientRecord, TeamMember } from "@/lib/dashboard/types";

interface ClientsPageClientProps {
  clients: ClientRecord[];
  profile: Profile;
  canAssign: boolean;
  teamMembers: TeamMember[];
}

export function ClientsPageClient({
  clients,
  profile,
  canAssign,
  teamMembers,
}: ClientsPageClientProps) {
  const router = useRouter();
  const [editClient, setEditClient] = useState<ClientRecord | null>(null);

  const refresh = () => router.refresh();

  const handleSave = async (data: ClientFormData) => {
    if (!editClient) return;
    await updateClient(editClient.id, data);
    setEditClient(null);
    refresh();
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Kunden"
        description="Automatisch erstellt bei Lead-Konversion. Verantwortlichkeit und Vertragswerte pflegen."
      />

      <DataTable
        data={clients}
        rowKey={(row) => row.id}
        onRowClick={(client) => router.push(`/dashboard/clients/${client.id}`)}
        getRowAriaLabel={(client) =>
          `Kundenakte für ${client.company_name} öffnen`
        }
        emptyState={
          <EmptyState
            icon={Users}
            title="Noch keine Kunden"
            description="Setze den Lead-Status auf „Kunde“, um hier einen Kundendatensatz zu erzeugen."
          />
        }
        columns={[
          {
            key: "company",
            header: "Firma",
            render: (client) => (
              <div>
                <span className="font-medium text-foreground">
                  {client.company_name}
                </span>
                {client.customer_number && (
                  <div className="text-xs text-muted-soft">{client.customer_number}</div>
                )}
              </div>
            ),
          },
          {
            key: "responsible",
            header: "Verantwortlich",
            render: (client) => client.responsible_member_name || "—",
          },
          {
            key: "contract",
            header: "Vertragswert",
            render: (client) => formatCents(client.contract_value_cents),
          },
          {
            key: "retainer",
            header: "Retainer",
            hideOnMobile: true,
            render: (client) => formatCents(client.monthly_retainer_cents),
          },
          {
            key: "project",
            header: "Projektvolumen",
            hideOnMobile: true,
            render: (client) => formatCents(client.one_time_project_value_cents),
          },
          {
            key: "contact",
            header: "Ansprechpartner",
            hideOnMobile: true,
            render: (client) => client.contact_name || "—",
          },
          {
            key: "created",
            header: "Kunde seit",
            hideOnMobile: true,
            render: (client) => formatDate(client.created_at),
          },
          ...(clients.some((client) =>
            canEditClientRevenue(profile, client.responsible_member_id),
          )
            ? [
                {
                  key: "actions",
                  header: "Aktionen",
                  className: "w-[80px]",
                  render: (client: ClientRecord) =>
                    canEditClientRevenue(profile, client.responsible_member_id) ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditClient(client);
                        }}
                        className="dashboard-icon-btn rounded-lg p-2 text-muted hover:text-foreground"
                        aria-label={`${client.company_name} bearbeiten`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-xs text-muted-soft">—</span>
                    ),
                },
              ]
            : []),
        ]}
      />

      {editClient && (
        <ClientModal
          key={editClient.id}
          open={Boolean(editClient)}
          onClose={() => setEditClient(null)}
          client={editClient}
          onSave={handleSave}
          canAssign={canAssign}
          teamMembers={teamMembers}
        />
      )}
    </div>
  );
}
