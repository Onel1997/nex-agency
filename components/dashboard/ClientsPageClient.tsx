"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, Pencil, Trash2, Users } from "lucide-react";
import {
  archiveClient,
  deleteClient,
  updateClient,
} from "@/app/dashboard/clients/actions";
import { ConfirmDialog } from "./ConfirmDialog";
import { DashboardHeader } from "./DashboardHeader";
import { DataTable } from "./DataTable";
import { EmptyState } from "./EmptyState";
import { ClientModal } from "./ClientModal";
import { Toast } from "./Toast";
import type { ClientFormData } from "./ClientForm";
import { formatCents, formatDate } from "@/lib/dashboard/format";
import type { Profile } from "@/lib/auth/types";
import {
  canEditClientRevenue,
  isManagement,
  isSuperAdmin,
} from "@/lib/auth/permissions";
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
  const [archiveTarget, setArchiveTarget] = useState<ClientRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canManageClients = isManagement(profile);
  const canDeleteClients = isSuperAdmin(profile);
  const showActionsColumn = clients.some(
    (client) =>
      canEditClientRevenue(profile, client.responsible_member_id) ||
      canManageClients ||
      canDeleteClients,
  );

  const refresh = () => router.refresh();

  const handleSave = async (data: ClientFormData) => {
    if (!editClient) return;
    await updateClient(editClient.id, data);
    setEditClient(null);
    refresh();
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;

    setError(null);
    try {
      await archiveClient(archiveTarget.id);
      setArchiveTarget(null);
      setToast(`${archiveTarget.company_name} wurde archiviert`);
      refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kunde konnte nicht archiviert werden",
      );
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setError(null);
    try {
      await deleteClient(deleteTarget.id);
      setDeleteTarget(null);
      setToast(`${deleteTarget.company_name} wurde gelöscht`);
      refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kunde konnte nicht gelöscht werden",
      );
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Kunden"
        description="Automatisch erstellt bei Lead-Konversion. Verantwortlichkeit und Lead-Schätzungen pflegen."
      />

      {error ? (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </div>
      ) : null}

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
            description="Setze den Lead-Status auf „Gewonnen“ und wandle den Lead in einen Kunden um."
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
            key: "lead_estimate",
            header: "Lead-Schätzung",
            render: (client) => formatCents(client.lead_estimated_value_cents),
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
          ...(showActionsColumn
            ? [
                {
                  key: "actions",
                  header: "Aktionen",
                  className: "w-[120px]",
                  render: (client: ClientRecord) => {
                    const canEdit = canEditClientRevenue(
                      profile,
                      client.responsible_member_id,
                    );

                    if (!canEdit && !canManageClients && !canDeleteClients) {
                      return <span className="text-xs text-muted-soft">—</span>;
                    }

                    return (
                      <div className="flex items-center gap-1">
                        {canEdit ? (
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
                        ) : null}
                        {canManageClients ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setArchiveTarget(client);
                            }}
                            className="dashboard-icon-btn rounded-lg p-2 text-muted hover:text-foreground"
                            aria-label={`${client.company_name} archivieren`}
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        ) : null}
                        {canDeleteClients ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteTarget(client);
                            }}
                            className="dashboard-icon-btn rounded-lg p-2 text-muted hover:text-red-300"
                            aria-label={`${client.company_name} löschen`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    );
                  },
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

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        title="Kunde archivieren"
        description="Der Kunde wird aus der aktiven Kundenliste entfernt, bleibt aber für Rechnungen, Verträge und Finanzberichte erhalten."
        confirmLabel="Archivieren"
        onConfirm={handleArchiveConfirm}
      >
        {archiveTarget ? (
          <dl className="space-y-2 rounded-xl bg-surface/50 px-4 py-3 text-sm ring-1 ring-border">
            <div>
              <dt className="text-muted-soft">Firma</dt>
              <dd className="font-medium text-foreground">{archiveTarget.company_name}</dd>
            </div>
            <div>
              <dt className="text-muted-soft">Ansprechpartner</dt>
              <dd className="text-foreground">{archiveTarget.contact_name || "—"}</dd>
            </div>
          </dl>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Kunde löschen"
        description="Der Kunde wird aus der Kundenliste entfernt. Rechnungen, Verträge und Finanzberichte bleiben für die Historie erhalten."
        confirmLabel="Kunde löschen"
        variant="danger"
        onConfirm={handleDeleteConfirm}
      >
        {deleteTarget ? (
          <div className="space-y-4">
            <dl className="space-y-2 rounded-xl bg-surface/50 px-4 py-3 text-sm ring-1 ring-border">
              <div>
                <dt className="text-muted-soft">Firma</dt>
                <dd className="font-medium text-foreground">{deleteTarget.company_name}</dd>
              </div>
              <div>
                <dt className="text-muted-soft">Ansprechpartner</dt>
                <dd className="text-foreground">{deleteTarget.contact_name || "—"}</dd>
              </div>
            </dl>
            <div className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-100 ring-1 ring-amber-500/20">
              <p className="font-medium">Folgende Daten bleiben erhalten:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-100/90">
                <li>Rechnungen und Verträge</li>
                <li>Finanz- und Provisionshistorie</li>
                <li>Freelancer-Rechnungen</li>
              </ul>
            </div>
          </div>
        ) : null}
      </ConfirmDialog>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
