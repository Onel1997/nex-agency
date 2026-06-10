import { CalendarDays } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { getAppointments } from "@/lib/dashboard/leads";
import type { AppointmentRow } from "@/lib/dashboard/types";

export default async function AppointmentsPage() {
  let appointments: AppointmentRow[] = [];
  let error: string | null = null;

  try {
    appointments = await getAppointments();
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Termine konnten nicht geladen werden";
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Termine"
        description="Leads mit Status „Termin“ — vorbereitet für Cal.com-Integration."
      />

      {error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </div>
      )}

      <DataTable
        data={appointments}
        rowKey={(row) => row.id}
        emptyState={
          <EmptyState
            icon={CalendarDays}
            title="Noch keine Termine"
            description="Leads mit Status „Termin“ erscheinen hier automatisch."
          />
        }
        columns={[
          {
            key: "company",
            header: "Firma",
            render: (lead) => (
              <span className="font-medium">{lead.company_name}</span>
            ),
          },
          {
            key: "contact",
            header: "Ansprechpartner",
            hideOnMobile: true,
            render: (lead) => lead.contact_name || "—",
          },
          {
            key: "email",
            header: "E-Mail",
            hideOnMobile: true,
            render: (lead) => lead.email || "—",
          },
          {
            key: "phone",
            header: "Telefon",
            hideOnMobile: true,
            render: (lead) => lead.phone || "—",
          },
          {
            key: "assignee",
            header: "Verantwortlich",
            render: (lead) => lead.assignee_name || "—",
          },
          {
            key: "status",
            header: "Terminstatus",
            render: () => (
              <span className="inline-flex rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-300 ring-1 ring-blue-500/25 ring-inset">
                Geplant
              </span>
            ),
          },
          {
            key: "cal",
            header: "Cal.com",
            hideOnMobile: true,
            render: () => <span className="text-muted">— Sync folgt</span>,
          },
        ]}
      />
    </div>
  );
}
