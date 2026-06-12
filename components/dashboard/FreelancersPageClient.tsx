"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, Euro, Users, Wallet } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { formatCents } from "@/lib/dashboard/format";
import type { FreelancerDashboardStats } from "@/lib/dashboard/freelancer-stats";
import type { FreelancerRecord } from "@/lib/dashboard/types";

interface FreelancersPageClientProps {
  freelancers: FreelancerRecord[];
  stats: FreelancerDashboardStats;
}

export function FreelancersPageClient({
  freelancers,
  stats,
}: FreelancersPageClientProps) {
  const router = useRouter();

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <DashboardHeader
          title="Freelancer"
          description="Team-Freelancer und deren Projekt-Auszahlungen im Überblick."
        />
        <p className="text-sm text-muted">
          Freelancer werden im Bereich{" "}
          <Link href="/dashboard/team" className="dashboard-link">
            Team
          </Link>{" "}
          angelegt.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Freelancer gesamt"
          value={String(stats.totalFreelancers)}
          icon={Users}
        />
        <KpiCard
          label="Verdient"
          value={formatCents(stats.totalEarnedCents)}
          icon={Euro}
          trend="Summe aller Freelancer-Projektanteile"
        />
        <KpiCard
          label="Bereits ausgezahlte Freelancer"
          value={formatCents(stats.totalPaidOutCents)}
          icon={Banknote}
          trend="Summe aller Projekt-Auszahlungen"
        />
        <KpiCard
          label="Offene Auszahlungen"
          value={formatCents(stats.openPayoutsCents)}
          icon={Wallet}
          trend="Noch nicht ausgezahlt"
        />
      </div>

      <DataTable
        onRowClick={(freelancer) =>
          router.push(`/dashboard/finance/freelancers/${freelancer.id}`)
        }
        getRowAriaLabel={(freelancer) => `Freelancer ${freelancer.name} öffnen`}
        columns={[
          {
            key: "name",
            header: "Freelancer",
            render: (freelancer) => (
              <span className="font-medium text-foreground">{freelancer.name}</span>
            ),
          },
          {
            key: "contact",
            header: "E-Mail",
            hideOnMobile: true,
            render: (freelancer) => freelancer.email ?? "—",
          },
          {
            key: "projects",
            header: "Zugewiesene Projekte",
            render: (freelancer) => {
              if (freelancer.assigned_project_count === 0) return "—";

              const preview = freelancer.assigned_project_names.slice(0, 2).join(", ");
              const suffix =
                freelancer.assigned_project_count > 2
                  ? ` (+${freelancer.assigned_project_count - 2})`
                  : "";

              return (
                <span title={freelancer.assigned_project_names.join(", ")}>
                  {preview}
                  {suffix}
                </span>
              );
            },
          },
          {
            key: "earned",
            header: "Verdient",
            className: "text-right",
            render: (freelancer) => formatCents(freelancer.total_earned_cents),
          },
          {
            key: "paid",
            header: "Ausgezahlt",
            className: "text-right",
            hideOnMobile: true,
            render: (freelancer) => formatCents(freelancer.total_paid_out_cents),
          },
          {
            key: "open",
            header: "Offen",
            className: "text-right",
            render: (freelancer) => formatCents(freelancer.outstanding_cents),
          },
        ]}
        data={freelancers}
        rowKey={(freelancer) => freelancer.id}
        emptyState={
          <EmptyState
            icon={Users}
            title="Keine Freelancer"
            description="Legen Sie im Bereich Team ein aktives Mitglied mit der Rolle Freelancer an."
          />
        }
      />
    </div>
  );
}
