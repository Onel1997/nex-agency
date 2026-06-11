"use client";

import { useState } from "react";
import { CommissionStatusBadge } from "@/components/dashboard/CommissionStatusBadge";
import { ClientRevenueModal } from "@/components/dashboard/ClientRevenueModal";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { formatCents } from "@/lib/dashboard/format";
import type { ClientRevenueRecord, FinanceStats } from "@/lib/dashboard/types";
import { Banknote, CircleDollarSign, Euro, Receipt, Wallet } from "lucide-react";
import Link from "next/link";

interface FinancePageClientProps {
  stats: FinanceStats;
  clients: ClientRevenueRecord[];
}

export function FinancePageClient({ stats, clients }: FinancePageClientProps) {
  const [editingClient, setEditingClient] = useState<ClientRevenueRecord | null>(
    null,
  );

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Finanzen"
        description="Umsatz, wiederkehrende Einnahmen und Provisionsübersicht — nur für Administratoren."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Gesamtumsatz"
          value={formatCents(stats.totalRevenueCents)}
          icon={Euro}
          trend="Summe aller Kundenumsätze"
        />
        <KpiCard
          label="Monatlicher Umsatz (MRR)"
          value={formatCents(stats.monthlyRecurringRevenueCents)}
          icon={CircleDollarSign}
          trend="Wiederkehrende monatliche Einnahmen"
        />
        <KpiCard
          label="Offene Provisionen"
          value={formatCents(stats.outstandingCommissionsCents)}
          icon={Wallet}
          trend="Ausstehend & offen"
        />
        <KpiCard
          label="Bezahlte Provisionen"
          value={formatCents(stats.paidCommissionsCents)}
          icon={Banknote}
          trend="Bereits ausgezahlt"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
            Kundenumsätze
          </h2>
          <p className="mt-1 text-sm text-muted">
            Umsatzfelder und Provisionsstatus pro Kunde verwalten.
          </p>
        </div>
        <Link href="/dashboard/performance" className="dashboard-link text-sm">
          Team-Performance →
        </Link>
      </div>

      <DataTable
        columns={[
          {
            key: "company",
            header: "Kunde",
            render: (client) => (
              <div>
                <div className="font-medium text-foreground">{client.company_name}</div>
                <div className="text-xs text-muted-soft">
                  {client.responsible_member_name ?? "—"}
                </div>
              </div>
            ),
          },
          {
            key: "monthly",
            header: "Monatlich",
            className: "text-right",
            hideOnMobile: true,
            render: (client) => formatCents(client.monthly_revenue_cents),
          },
          {
            key: "setup",
            header: "Setup",
            className: "text-right",
            hideOnMobile: true,
            render: (client) => formatCents(client.setup_fee_cents),
          },
          {
            key: "total",
            header: "Gesamt",
            className: "text-right",
            render: (client) => formatCents(client.total_revenue_cents),
          },
          {
            key: "commission",
            header: "Provision",
            className: "text-right",
            hideOnMobile: true,
            render: (client) => formatCents(client.commission_cents),
          },
          {
            key: "status",
            header: "Status",
            render: (client) => (
              <CommissionStatusBadge status={client.commission_status} />
            ),
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            render: (client) => (
              <button
                type="button"
                onClick={() => setEditingClient(client)}
                className="dashboard-link text-xs"
              >
                Bearbeiten
              </button>
            ),
          },
        ]}
        data={clients}
        rowKey={(client) => client.id}
        emptyState={
          <EmptyState
            icon={Receipt}
            title="Keine Kundenumsätze"
            description="Sobald Kunden mit Umsatzdaten vorhanden sind, erscheinen sie hier."
          />
        }
      />

      <ClientRevenueModal
        client={editingClient}
        open={editingClient !== null}
        onClose={() => setEditingClient(null)}
      />
    </div>
  );
}
