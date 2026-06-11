"use client";

import { useState, useTransition } from "react";
import { updateMemberCommissionRate } from "@/app/dashboard/finance/actions";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Modal } from "@/components/dashboard/Modal";
import { PerformanceCharts } from "@/components/dashboard/PerformanceCharts";
import { PerformanceKpiGrid } from "@/components/dashboard/PerformanceKpiGrid";
import { PerformanceMemberCards } from "@/components/dashboard/PerformanceMemberCards";
import { PerformancePeriodFilter } from "@/components/dashboard/PerformancePeriodFilter";
import { PerformanceRankingTable } from "@/components/dashboard/PerformanceRankingTable";
import { parsePercent } from "@/lib/dashboard/format";
import type { PerformanceDashboardData, TeamPerformanceStats } from "@/lib/dashboard/types";
import Link from "next/link";

interface PerformancePageClientProps {
  data: PerformanceDashboardData;
  showCommissionEditor: boolean;
  commissionMembers: TeamPerformanceStats[];
}

export function PerformancePageClient({
  data,
  showCommissionEditor,
  commissionMembers,
}: PerformancePageClientProps) {
  const [editingMember, setEditingMember] = useState<TeamPerformanceStats | null>(
    null,
  );

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Performance"
        description={
          data.isTeamView
            ? "Zentrale Vertriebs- und Team-Auswertung für NexAgency."
            : "Ihre persönliche Vertriebs- und Performance-Übersicht."
        }
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <PerformancePeriodFilter activePeriod={data.period} />
        {showCommissionEditor && (
          <Link href="/dashboard/finance" className="dashboard-link text-sm">
            ← Finanzübersicht
          </Link>
        )}
      </div>

      <PerformanceKpiGrid kpis={data.kpis} />

      <PerformanceCharts
        revenueTrend={data.revenueTrend}
        leadsByStatus={data.leadsByStatus}
        commissions={data.commissions}
      />

      {data.isTeamView && (
        <PerformanceRankingTable
          members={data.members}
          isTeamView={data.isTeamView}
        />
      )}

      <PerformanceMemberCards members={data.members} />

      {showCommissionEditor && commissionMembers.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
            Provisionssätze
          </h2>
          <p className="mt-2 text-sm text-muted">
            Individuelle Provisionssätze für Teammitglieder festlegen.
          </p>

          <div className="mt-4 divide-y divide-border">
            {commissionMembers.map((member) => (
              <div
                key={member.userId}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-medium text-foreground">{member.fullName}</p>
                  <p className="text-xs text-muted-soft">{member.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingMember(member)}
                  className="dashboard-btn-secondary text-xs"
                >
                  {member.commissionRate}% bearbeiten
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <CommissionRateModal
        member={editingMember}
        open={editingMember !== null}
        onClose={() => setEditingMember(null)}
      />
    </div>
  );
}

function CommissionRateModal({
  member,
  open,
  onClose,
}: {
  member: TeamPerformanceStats | null;
  open: boolean;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!member) return null;

  const handleSubmit = (formData: FormData) => {
    setError(null);
    const rate = parsePercent(String(formData.get("commission_rate") ?? ""));
    if (rate == null) {
      setError("Bitte einen gültigen Prozentsatz zwischen 0 und 100 eingeben.");
      return;
    }

    startTransition(async () => {
      try {
        await updateMemberCommissionRate(member.userId, rate);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={`Provisionssatz — ${member.fullName}`}>
      <p className="mb-4 text-sm text-muted">
        Prozentsatz für die Provisionsberechnung auf Kundenumsätze.
      </p>
      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Provisionssatz (%)
          </span>
          <input
            name="commission_rate"
            type="text"
            inputMode="decimal"
            defaultValue={String(member.commissionRate)}
            className="dashboard-input"
            placeholder="10"
            required
          />
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="dashboard-btn-secondary">
            Abbrechen
          </button>
          <button type="submit" disabled={isPending} className="dashboard-btn-primary">
            {isPending ? "Speichern…" : "Speichern"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
