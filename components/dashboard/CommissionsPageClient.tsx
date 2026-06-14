"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveCommissionEntry,
  payCommissionEntry,
} from "@/app/dashboard/finance/commissions/actions";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { CommissionEntryStatusBadge } from "@/components/dashboard/CommissionEntryStatusBadge";
import { SalesDealAttributionBadge } from "@/components/dashboard/SalesDealAttributionBadge";
import { formatCents, formatDate, formatPercent } from "@/lib/dashboard/format";
import type {
  CommissionCenterData,
} from "@/lib/dashboard/types";
import { Banknote, CheckCircle2, Clock, Wallet } from "lucide-react";

interface CommissionsPageClientProps {
  data: CommissionCenterData;
}

export function CommissionsPageClient({ data }: CommissionsPageClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const runAction = (action: () => Promise<void>) => {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Aktion fehlgeschlagen");
      }
    });
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Provisionen"
        description="Setter- und Closer-Provisionen — ausgelöst durch bezahlte Setup- und Projektrechnungen."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Offene Provisionen"
          value={formatCents(data.stats.pendingCents)}
          icon={Clock}
        />
        <KpiCard
          label="Freigegebene Provisionen"
          value={formatCents(data.stats.approvedCents)}
          icon={CheckCircle2}
        />
        <KpiCard
          label="Ausbezahlte Provisionen"
          value={formatCents(data.stats.paidCents)}
          icon={Wallet}
        />
        <KpiCard
          label="Gesamte Provisionskosten"
          value={formatCents(data.stats.totalCostCents)}
          icon={Banknote}
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </div>
      )}

      <DataTable
        data={data.entries}
        rowKey={(entry) => entry.id}
        emptyState={
          <EmptyState
            icon={Banknote}
            title="Keine Provisionen"
            description="Provisionen entstehen automatisch, wenn Setup- oder Projektrechnungen als bezahlt markiert werden."
          />
        }
        columns={[
          {
            key: "client",
            header: "Kunde",
            render: (entry) => (
              <span className="font-medium">{entry.client_name}</span>
            ),
          },
          {
            key: "setter",
            header: "Setter",
            hideOnMobile: true,
            render: (entry) => entry.setter_name ?? "—",
          },
          {
            key: "closer",
            header: "Closer",
            hideOnMobile: true,
            render: (entry) => entry.closer_name ?? "—",
          },
          {
            key: "project",
            header: "Projektwert",
            hideOnMobile: true,
            render: (entry) => formatCents(entry.project_value_cents),
          },
          {
            key: "setter_pct",
            header: "Setter %",
            className: "text-right",
            hideOnMobile: true,
            render: (entry) => formatPercent(entry.setter_rate),
          },
          {
            key: "setter_amount",
            header: "Setter Betrag",
            className: "text-right",
            render: (entry) => formatCents(entry.setter_commission_cents),
          },
          {
            key: "closer_pct",
            header: "Closer %",
            className: "text-right",
            hideOnMobile: true,
            render: (entry) => formatPercent(entry.closer_rate),
          },
          {
            key: "closer_amount",
            header: "Closer Betrag",
            className: "text-right",
            render: (entry) => formatCents(entry.closer_commission_cents),
          },
          {
            key: "attribution",
            header: "Attribution",
            hideOnMobile: true,
            render: (entry) => (
              <SalesDealAttributionBadge dealType={entry.deal_type} />
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (entry) => (
              <CommissionEntryStatusBadge status={entry.status} />
            ),
          },
          {
            key: "date",
            header: "Datum",
            hideOnMobile: true,
            render: (entry) => formatDate(entry.created_at),
          },
          {
            key: "actions",
            header: "Aktionen",
            render: (entry) => (
              <div className="flex flex-wrap gap-2">
                {entry.status === "pending" && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      runAction(() => approveCommissionEntry(entry.id))
                    }
                    className="dashboard-btn-secondary px-2.5 py-1.5 text-xs"
                  >
                    Freigeben
                  </button>
                )}
                {entry.status === "approved" && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      runAction(() => payCommissionEntry(entry.id))
                    }
                    className="dashboard-btn-primary px-2.5 py-1.5 text-xs"
                  >
                    Auszahlen
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
