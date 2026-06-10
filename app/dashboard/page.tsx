import {
  CalendarDays,
  Euro,
  Target,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { TeamStatsTable } from "@/components/dashboard/TeamStatsTable";
import { getProfile, isAdmin } from "@/lib/auth/session";
import { getRecentActivities } from "@/lib/dashboard/activity";
import type { ActivityLog } from "@/lib/dashboard/activity-types";
import { getDashboardStats, getTeamStats } from "@/lib/dashboard/leads";
import type { DashboardStats, TeamMemberStats } from "@/lib/dashboard/types";

export default async function DashboardPage() {
  const profile = await getProfile();
  const adminView = profile ? isAdmin(profile) : false;

  let stats: DashboardStats = {
    leadsCount: 0,
    appointmentsCount: 0,
    clientsCount: 0,
    pipelineCount: 0,
  };
  let teamStats: TeamMemberStats[] | null = null;
  let activities: ActivityLog[] = [];
  let dbError: string | null = null;

  try {
    [stats, teamStats, activities] = await Promise.all([
      getDashboardStats(),
      adminView ? getTeamStats() : Promise.resolve(null),
      adminView ? getRecentActivities(6) : Promise.resolve([]),
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
          adminView
            ? "Team-Überblick über Leads, Termine und Pipeline — NexAgency CRM."
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
          trend={adminView ? "Gesamt im Team" : "Meine Leads"}
        />
        <KpiCard
          label="Termine"
          value={stats.appointmentsCount}
          icon={CalendarDays}
          href="/dashboard/appointments"
          trend={adminView ? "Team-Termine" : "Meine Termine"}
        />
        <KpiCard
          label="Kunden"
          value={stats.clientsCount}
          icon={Users}
          href="/dashboard/clients"
          trend={adminView ? "Team-Kunden" : "Meine Kunden"}
        />
        {adminView ? (
          <KpiCard
            label="Team"
            value={stats.teamCount ?? 0}
            icon={UserCog}
            href="/dashboard/team"
            trend="Aktive Mitarbeiter"
          />
        ) : (
          <KpiCard
            label="Pipeline"
            value={stats.pipelineCount}
            icon={Euro}
            trend="Meine aktiven Pipeline-Leads"
          />
        )}
      </div>

      {adminView && teamStats && teamStats.length > 0 && (
        <TeamStatsTable stats={teamStats} />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {adminView && (
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
            {adminView && (
              <Link href="/dashboard/team" className="dashboard-btn-secondary">
                Team verwalten
              </Link>
            )}
          </div>
        </div>

        {!adminView && (
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
              Mitarbeiter
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Sie sehen nur Ihre eigenen Leads, Termine und Kunden. Änderungen
              werden automatisch in Termine und Kunden übernommen, wenn der
              Status entsprechend gesetzt wird.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
