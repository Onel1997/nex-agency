"use client";

import { useState, useTransition } from "react";
import { updateMemberCommissionRate } from "@/app/dashboard/finance/actions";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { TeamPerformanceTable } from "@/components/dashboard/TeamPerformanceTable";
import { Modal } from "@/components/dashboard/Modal";
import { parsePercent } from "@/lib/dashboard/format";
import type { TeamPerformanceStats } from "@/lib/dashboard/types";
import Link from "next/link";

interface PerformancePageClientProps {
  stats: TeamPerformanceStats[];
}

export function PerformancePageClient({ stats }: PerformancePageClientProps) {
  const [editingMember, setEditingMember] = useState<TeamPerformanceStats | null>(
    null,
  );

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Team-Performance"
        description="Leistungskennzahlen und Provisionssätze pro Teammitglied."
      />

      <div className="flex justify-end">
        <Link href="/dashboard/finance" className="dashboard-link text-sm">
          ← Finanzübersicht
        </Link>
      </div>

      <TeamPerformanceTable stats={stats} />

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
          Provisionssätze
        </h2>
        <p className="mt-2 text-sm text-muted">
          Individuelle Provisionssätze für Teammitglieder festlegen.
        </p>

        <div className="mt-4 divide-y divide-border">
          {stats.map((member) => (
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
