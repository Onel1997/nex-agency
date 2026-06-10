import { Users } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { formatDate } from "@/lib/dashboard/format";
import { getClients } from "@/lib/dashboard/clients";
import type { ClientRecord } from "@/lib/dashboard/types";

export default async function ClientsPage() {
  let clients: ClientRecord[] = [];
  let error: string | null = null;

  try {
    clients = await getClients();
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Kunden konnten nicht geladen werden";
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Kunden"
        description="Automatisch erstellt, wenn ein Lead den Status „Kunde“ erhält."
      />

      {error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </div>
      )}

      <DataTable
        data={clients}
        rowKey={(row) => row.id}
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
              <span className="font-medium">{client.company_name}</span>
            ),
          },
          {
            key: "contact",
            header: "Ansprechpartner",
            hideOnMobile: true,
            render: (client) => client.contact_name || "—",
          },
          {
            key: "email",
            header: "E-Mail",
            hideOnMobile: true,
            render: (client) => client.email || "—",
          },
          {
            key: "phone",
            header: "Telefon",
            hideOnMobile: true,
            render: (client) => client.phone || "—",
          },
          {
            key: "assignee",
            header: "Verantwortlich",
            render: (client) => client.assignee_name || "—",
          },
          {
            key: "status",
            header: "Status",
            hideOnMobile: true,
            render: () => (
              <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/25 ring-inset">
                Aktiv
              </span>
            ),
          },
          {
            key: "created",
            header: "Kunde seit",
            hideOnMobile: true,
            render: (client) => formatDate(client.created_at),
          },
        ]}
      />
    </div>
  );
}
