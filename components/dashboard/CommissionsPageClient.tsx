"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveCommissionEntry,
  payCommissionEntry,
} from "@/app/dashboard/finance/commissions/actions";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CommissionEntriesTable } from "@/components/dashboard/CommissionEntriesTable";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { formatCents } from "@/lib/dashboard/format";
import type { CommissionCenterData } from "@/lib/dashboard/types";
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

  const runBulkAction = (
    entryIds: string[],
    action: (entryId: string) => Promise<void>,
  ) => {
    if (entryIds.length === 0) return;

    setError(null);
    startTransition(async () => {
      try {
        for (const entryId of entryIds) {
          await action(entryId);
        }
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
        description="Setter- und Closer-Provisionen — ausgelöst durch bezahlte Setup-, Projekt- und Retainer-Rechnungen."
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

      <CommissionEntriesTable
        entries={data.entries}
        retainerInvoicesByClient={data.retainerInvoicesByClient}
        pending={pending}
        onApprove={(entryId) =>
          runAction(() => approveCommissionEntry(entryId))
        }
        onPay={(entryId) => runAction(() => payCommissionEntry(entryId))}
        onApproveMany={(entryIds) =>
          runBulkAction(entryIds, approveCommissionEntry)
        }
        onPayMany={(entryIds) => runBulkAction(entryIds, payCommissionEntry)}
      />
    </div>
  );
}
