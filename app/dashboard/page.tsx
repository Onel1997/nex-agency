import {
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Euro,
  Target,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { TeamStatsTable } from "@/components/dashboard/TeamStatsTable";
import { WorkflowActionPanel } from "@/components/dashboard/WorkflowActionPanel";
import { WorkflowKpiGrid } from "@/components/dashboard/WorkflowKpiGrid";
import { isManagement } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { getRecentActivities } from "@/lib/dashboard/activity";
import type { ActivityLog } from "@/lib/dashboard/activity-types";
import { getAppointmentStats } from "@/lib/dashboard/appointments";
import { getRecentClients } from "@/lib/dashboard/clients";
import { formatCents } from "@/lib/dashboard/format";
import { getDashboardStats, getRecentLeads, getTeamStats } from "@/lib/dashboard/leads";
import { getCommissionDashboardKpis } from "@/lib/dashboard/commission-center";
import {
  getClientWorkflowStatusMap,
  getWorkflowActionItems,
  getWorkflowDashboardStats,
} from "@/lib/dashboard/workflow-stats";
import type {
  AppointmentStats,
  ClientRecord,
  CommissionDashboardKpis,
  DashboardStats,
  Lead,
  TeamMemberStats,
} from "@/lib/dashboard/types";
import type { CustomerWorkflowStage, WorkflowStatus } from "@/lib/dashboard/workflow-status";

export default async function DashboardPage() {
  const profile = await getProfile();
  const managementView = profile ? isManagement(profile) : false;

  let stats: DashboardStats = {
    leadsCount: 0,
    appointmentsCount: 0,
    clientsCount: 0,
    pipelineCount: 0,
    pipelineValueCents: 0,
  };
  let appointmentStats: AppointmentStats = {
    todayCount: 0,
    weekCount: 0,
    confirmedCount: 0,
    completedCount: 0,
  };
  let teamStats: TeamMemberStats[] | null = null;
  let activities: ActivityLog[] = [];
  let recentLeads: Lead[] = [];
  let recentClients: ClientRecord[] = [];
  let commissionKpis: CommissionDashboardKpis | null = null;
  let workflowStats = {
    openLeads: 0,
    wonLeadsWithoutContract: 0,
    customersWithoutInvoice: 0,
    unpaidInvoices: 0,
    activeCustomers: 0,
    customersRequiringAction: 0,
    contractsMissing: 0,
    invoicesMissing: 0,
  };
  let workflowActions: Awaited<ReturnType<typeof getWorkflowActionItems>> = [];
  let clientWorkflowById: Record<string, WorkflowStatus<CustomerWorkflowStage>> = {};
  let dbError: string | null = null;

  try {
    const workflowStatusMapPromise = getClientWorkflowStatusMap();

    [stats, appointmentStats, teamStats, activities, recentLeads, recentClients, commissionKpis, workflowStats, workflowActions, clientWorkflowById] =
      await Promise.all([
        getDashboardStats(),
        getAppointmentStats(),
        managementView ? getTeamStats() : Promise.resolve(null),
        managementView ? getRecentActivities(6) : Promise.resolve([]),
        getRecentLeads(5),
        getRecentClients(5),
        managementView ? getCommissionDashboardKpis() : Promise.resolve(null),
        getWorkflowDashboardStats(),
        getWorkflowActionItems(8),
        workflowStatusMapPromise.then((map) => Object.fromEntries(map.entries())),
      ]);
  } catch (err) {
    dbError =
      err instanceof Error
        ? err.message
        : "Datenbankverbindung fehlgeschlagen";
  }

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Dashboard"
        description={
          managementView
            ? "Team-Überblick über Leads, Termine, Eigentümer und Vertragswerte — NexAgency CRM."
            : "Ihre Leads, Termine und Pipeline — NexAgency CRM."
        }
      />

      {dbError && (
        <div className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-200 ring-1 ring-amber-500/20">
          <p className="font-medium">Supabase nicht verbunden</p>
          <p className="mt-1 text-amber-200/80">
            {dbError}. Bitte{" "}
            <code className="rounded bg-black/20 px-1.5 py-0.5 text-xs">
              .env.local
            </code>{" "}
            konfigurieren und die Migration ausführen.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Leads"
          value={stats.leadsCount}
          icon={Target}
          href="/dashboard/leads"
          trend={managementView ? "Gesamt im Team" : "Meine Leads"}
        />
        <KpiCard
          label="Termine"
          value={stats.appointmentsCount}
          icon={CalendarDays}
          href="/dashboard/appointments"
          trend={managementView ? "Team-Termine" : "Meine Termine"}
        />
        <KpiCard
          label="Kunden"
          value={stats.clientsCount}
          icon={Users}
          href="/dashboard/clients"
          trend={managementView ? "Team-Kunden" : "Meine Kunden"}
        />
        {managementView ? (
          <KpiCard
            label="Team"
            value={stats.teamCount ?? 0}
            icon={UserCog}
            href="/dashboard/team"
            trend="Aktive Mitarbeiter"
          />
        ) : (
          <KpiCard
            label="Pipeline-Wert"
            value={formatCents(stats.pipelineValueCents)}
            icon={Euro}
            trend={`${stats.pipelineCount} aktive Pipeline-Leads`}
          />
        )}
      </div>

      <WorkflowKpiGrid stats={workflowStats} managementView={managementView} />

      {managementView && commissionKpis && (
        <div>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-soft">
            Provisionen
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Offene Provisionen"
              value={formatCents(commissionKpis.openCents)}
              icon={Euro}
              href="/dashboard/finance/commissions"
            />
            <KpiCard
              label="Provisionen diesen Monat"
              value={formatCents(commissionKpis.monthCents)}
              icon={Euro}
              href="/dashboard/finance/commissions"
            />
            <KpiCard
              label="Provisionen dieses Jahr"
              value={formatCents(commissionKpis.yearCents)}
              icon={Euro}
              href="/dashboard/finance/commissions"
            />
            <KpiCard
              label="Top Setter"
              value={
                commissionKpis.topSetters[0]
                  ? commissionKpis.topSetters[0].name
                  : "—"
              }
              icon={UserCog}
              trend={
                commissionKpis.topSetters[0]
                  ? formatCents(commissionKpis.topSetters[0].amountCents)
                  : undefined
              }
            />
          </div>
          {commissionKpis.topClosers[0] && (
            <p className="mt-3 text-sm text-muted">
              Top Closer: {commissionKpis.topClosers[0].name} (
              {formatCents(commissionKpis.topClosers[0].amountCents)})
            </p>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-soft">
          Termine Übersicht
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Heute"
            value={appointmentStats.todayCount}
            icon={CalendarClock}
            href="/dashboard/appointments"
            trend="Termine heute"
          />
          <KpiCard
            label="Diese Woche"
            value={appointmentStats.weekCount}
            icon={CalendarDays}
            href="/dashboard/appointments"
            trend="Termine diese Woche"
          />
          <KpiCard
            label="Bestätigt"
            value={appointmentStats.confirmedCount}
            icon={CalendarCheck2}
            href="/dashboard/appointments"
            trend="Bestätigte Termine"
          />
          <KpiCard
            label="Abgeschlossen"
            value={appointmentStats.completedCount}
            icon={CheckCircle2}
            href="/dashboard/appointments"
            trend="Erledigte Termine"
          />
        </div>
      </div>

      <DashboardOverview
        recentLeads={recentLeads}
        recentClients={recentClients}
        showOwnership={managementView}
        clientWorkflowById={clientWorkflowById}
      />

      <WorkflowActionPanel
        items={workflowActions}
        title={managementView ? "Offene Workflow-Aufgaben" : "Meine offenen Aufgaben"}
      />

      {managementView && teamStats && teamStats.length > 0 && (
        <TeamStatsTable stats={teamStats} />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {managementView && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
                Letzte Aktivitäten
              </h2>
              <Link href="/dashboard/activities" className="dashboard-link text-xs">
                Alle ansehen
              </Link>
            </div>
            <div className="mt-4">
              <ActivityFeed activities={activities} compact />
            </div>
          </div>
        )}

        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
            Schnellzugriff
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/dashboard/leads" className="dashboard-btn-secondary">
              Leads verwalten
            </Link>
            <Link href="/dashboard/appointments" className="dashboard-btn-secondary">
              Termine ansehen
            </Link>
            <Link href="/dashboard/clients" className="dashboard-btn-secondary">
              Kunden ansehen
            </Link>
            {managementView && (
              <Link href="/dashboard/team" className="dashboard-btn-secondary">
                Team verwalten
              </Link>
            )}
          </div>
        </div>

        {!managementView && (
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
              Mein Bereich
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Sie sehen Ihre Leads, Termine und Kunden. Eigentümer, Ersteller und
              Vertragswerte werden pro Datensatz angezeigt.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
