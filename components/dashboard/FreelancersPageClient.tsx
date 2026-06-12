"use client";

import { useState } from "react";
import Link from "next/link";
import { Banknote, FileCheck2, Users, Wallet } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { FreelancerModal } from "@/components/dashboard/FreelancerModal";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { formatCents, formatDate } from "@/lib/dashboard/format";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FreelancerRecord | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (freelancer: FreelancerRecord) => {
    setEditing(freelancer);
    setModalOpen(true);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <DashboardHeader
          title="Freelancer"
          description="Externe Dienstleister, Rechnungen und Auszahlungsstatus verwalten."
        />
        <button type="button" onClick={openCreate} className="dashboard-btn-primary">
          Freelancer anlegen
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Freelancer gesamt"
          value={String(stats.totalFreelancers)}
          icon={Users}
        />
        <KpiCard
          label="Offene Freelancer-Rechnungen"
          value={formatCents(stats.openFreelancerInvoicesCents)}
          icon={FileCheck2}
          trend="Status: eingereicht"
        />
        <KpiCard
          label="Bezahlte Freelancer-Rechnungen"
          value={formatCents(stats.paidFreelancerInvoicesCents)}
          icon={Banknote}
          trend="Status: bezahlt"
        />
        <KpiCard
          label="Offene Auszahlungen"
          value={formatCents(stats.openPayoutsCents)}
          icon={Wallet}
          href="/dashboard/finance/payouts"
          trend="Noch nicht ausgezahlt"
        />
      </div>

      <DataTable
        columns={[
          {
            key: "name",
            header: "Freelancer",
            render: (freelancer) => (
              <div className="py-1">
                <Link
                  href={`/dashboard/finance/freelancers/${freelancer.id}`}
                  className="font-medium text-foreground hover:text-violet-300"
                >
                  {freelancer.name}
                </Link>
                <div className="text-xs text-muted-soft">
                  {freelancer.company_name ?? "—"}
                </div>
              </div>
            ),
          },
          {
            key: "contact",
            header: "Kontakt",
            hideOnMobile: true,
            render: (freelancer) => freelancer.email ?? "—",
          },
          {
            key: "rate",
            header: "Provision",
            className: "text-right",
            hideOnMobile: true,
            render: (freelancer) => `${freelancer.default_commission_rate}%`,
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
          {
            key: "last",
            header: "Letzte Auszahlung",
            hideOnMobile: true,
            render: (freelancer) =>
              freelancer.last_payout_at
                ? formatDate(freelancer.last_payout_at)
                : "—",
          },
          {
            key: "status",
            header: "Status",
            render: (freelancer) => (
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                  freelancer.is_active
                    ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/25"
                    : "bg-zinc-500/15 text-zinc-300 ring-zinc-500/25"
                }`}
              >
                {freelancer.is_active ? "Aktiv" : "Inaktiv"}
              </span>
            ),
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            render: (freelancer) => (
              <button
                type="button"
                onClick={() => openEdit(freelancer)}
                className="dashboard-link text-xs"
              >
                Bearbeiten
              </button>
            ),
          },
        ]}
        data={freelancers}
        rowKey={(freelancer) => freelancer.id}
        emptyState={
          <EmptyState
            icon={Users}
            title="Keine Freelancer"
            description="Legen Sie den ersten Freelancer an, um Rechnungen und Auszahlungen zu verwalten."
          />
        }
      />

      <FreelancerModal
        freelancer={editing}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
