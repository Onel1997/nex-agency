"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Banknote, CheckCircle2, Clock, FileCheck2, Wallet } from "lucide-react";
import {
  approveCommissionEntry,
  payCommissionEntry,
} from "@/app/dashboard/finance/commissions/actions";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { PayoutCenterDetailPanel } from "@/components/dashboard/PayoutCenterDetailPanel";
import { PayoutDerivedStatusBadge } from "@/components/dashboard/PayoutDerivedStatusBadge";
import { formatCents } from "@/lib/dashboard/format";
import {
  PAYOUT_DERIVED_STATUSES,
  PAYOUT_DERIVED_STATUS_LABELS,
  type PayoutDerivedStatus,
} from "@/lib/dashboard/payout-center-constants";
import type { PayoutCenterData, PayoutCenterLineItem } from "@/lib/dashboard/types";

interface PayoutCenterPageClientProps {
  data: PayoutCenterData;
}

const TAB_ICONS: Record<PayoutDerivedStatus, typeof Clock> = {
  offen: Clock,
  freigegeben: CheckCircle2,
  ausgezahlt: Wallet,
  abgeschlossen: FileCheck2,
};

export function PayoutCenterPageClient({ data }: PayoutCenterPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedLine, setSelectedLine] = useState<PayoutCenterLineItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const setTab = useCallback(
    (status: PayoutDerivedStatus) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("status", status);
      router.push(`/dashboard/finance/payouts?${params.toString()}`);
    },
    [router, searchParams],
  );

  const runAction = (action: () => Promise<void>) => {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
        setSelectedLine(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Aktion fehlgeschlagen");
      }
    });
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Auszahlungen"
        description="Provisions-Auszahlungen an Setter und Closer — von der Freigabe bis zur Freelancer-Rechnung."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Offene Auszahlungen"
          value={formatCents(data.stats.offenCents)}
          icon={Clock}
        />
        <KpiCard
          label="Freigegebene Auszahlungen"
          value={formatCents(data.stats.freigegebenCents)}
          icon={CheckCircle2}
        />
        <KpiCard
          label="Ausgezahlte Auszahlungen"
          value={formatCents(data.stats.ausgezahltCents)}
          icon={Wallet}
        />
        <KpiCard
          label="Abgeschlossene Auszahlungen"
          value={formatCents(data.stats.abgeschlossenCents)}
          icon={FileCheck2}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {PAYOUT_DERIVED_STATUSES.map((status) => {
          const Icon = TAB_ICONS[status];
          const isActive = data.activeStatus === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setTab(status)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/25"
                  : "text-muted hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {PAYOUT_DERIVED_STATUS_LABELS[status]}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </div>
      )}

      <DataTable
        columns={[
          {
            key: "freelancer",
            header: "Freelancer",
            render: (line) => line.profileName,
          },
          {
            key: "role",
            header: "Rolle",
            hideOnMobile: true,
            render: (line) => line.roleLabel,
          },
          {
            key: "client",
            header: "Kunde",
            render: (line) => line.clientName,
          },
          {
            key: "type",
            header: "Typ",
            hideOnMobile: true,
            render: (line) => line.entryTypeLabel,
          },
          {
            key: "month",
            header: "Monat",
            hideOnMobile: true,
            render: (line) => line.billingPeriodLabel,
          },
          {
            key: "amount",
            header: "Betrag",
            className: "text-right",
            render: (line) => formatCents(line.amountCents),
          },
          {
            key: "status",
            header: "Status",
            render: (line) => <PayoutDerivedStatusBadge status={line.derivedStatus} />,
          },
          {
            key: "invoice",
            header: "Rechnung",
            hideOnMobile: true,
            render: (line) =>
              line.invoiceNumber ? (
                <a
                  href={`/api/commission-freelancer-invoices/${line.invoiceId}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="dashboard-link font-mono text-xs"
                >
                  {line.invoiceNumber}
                </a>
              ) : (
                "—"
              ),
          },
        ]}
        data={data.lines}
        rowKey={(line) => line.lineKey}
        onRowClick={setSelectedLine}
        getRowAriaLabel={(line) =>
          `Auszahlung ${line.profileName} ${formatCents(line.amountCents)}`
        }
        emptyState={
          <EmptyState
            icon={Banknote}
            title={`Keine ${PAYOUT_DERIVED_STATUS_LABELS[data.activeStatus].toLowerCase()}en Auszahlungen`}
            description="Provisionen erscheinen hier, sobald Commission Entries existieren."
          />
        }
      />

      <PayoutCenterDetailPanel
        line={selectedLine}
        open={Boolean(selectedLine)}
        onClose={() => setSelectedLine(null)}
        pending={pending}
        onApprove={(entryId) =>
          runAction(() => approveCommissionEntry(entryId))
        }
        onPay={(entryId, role) =>
          runAction(() => payCommissionEntry(entryId, role))
        }
      />
    </div>
  );
}
