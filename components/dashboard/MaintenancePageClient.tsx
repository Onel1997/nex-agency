"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Database, Trash2 } from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { resetTestData } from "@/app/dashboard/system/maintenance/actions";
import {
  RESET_TEST_DATA_CONFIRMATION,
  type MaintenanceStats,
} from "@/lib/dashboard/maintenance";
import type { ActivityLog } from "@/lib/dashboard/activity-types";

interface MaintenancePageClientProps {
  stats: MaintenanceStats;
  auditLogs: ActivityLog[];
}

const STAT_ITEMS: Array<{
  key: keyof MaintenanceStats;
  label: string;
}> = [
  { key: "leads", label: "Leads" },
  { key: "clients", label: "Kunden" },
  { key: "appointments", label: "Termine" },
  { key: "contracts", label: "Verträge" },
  { key: "invoices", label: "Rechnungen" },
  { key: "commissionEntries", label: "Provisionen" },
  { key: "teamMembers", label: "Teammitglieder" },
];

export function MaintenancePageClient({
  stats,
  auditLogs,
}: MaintenancePageClientProps) {
  const router = useRouter();
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canConfirm = confirmation === RESET_TEST_DATA_CONFIRMATION;

  const handleReset = async () => {
    setError(null);
    setSuccess(null);

    try {
      const result = await resetTestData(confirmation);
      const totalDeleted = Object.values(result.deleted).reduce(
        (sum, count) => sum + count,
        0,
      );
      setResetOpen(false);
      setConfirmation("");
      setSuccess(
        `Testdaten zurückgesetzt. ${totalDeleted} Datensätze entfernt.`,
      );
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Testdaten konnten nicht zurückgesetzt werden",
      );
    }
  };

  return (
    <div className="space-y-6">
      {success ? (
        <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 ring-1 ring-emerald-500/20">
          {success}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </div>
      ) : null}

      <section className="glass-card rounded-2xl p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-500/25">
            <Database className="h-5 w-5 text-violet-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Datenbankstatistiken
            </h2>
            <p className="text-sm text-muted">
              Aktuelle Anzahl operativer Datensätze in der Datenbank.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STAT_ITEMS.map((item) => (
            <div
              key={item.key}
              className="rounded-xl border border-border/60 bg-white/[0.02] px-4 py-4"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-soft">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {stats[item.key].toLocaleString("de-DE")}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-muted">
          Provisionen: {stats.commissionEntries.toLocaleString("de-DE")} Einträge,{" "}
          {stats.commissionPayouts.toLocaleString("de-DE")} Auszahlungen.
        </p>
      </section>

      <section className="glass-card rounded-2xl border border-red-500/20 p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 ring-1 ring-red-500/25">
            <AlertTriangle className="h-5 w-5 text-red-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Testdaten zurücksetzen
            </h2>
            <p className="mt-1 text-sm text-muted">
              Löscht operative CRM- und Finanzdaten unwiderruflich. Profile,
              Auth-Benutzer, Rollen, Berechtigungen, Knowledge Center und
              Einstellungen bleiben erhalten.
            </p>
          </div>
        </div>

        <ul className="mb-5 grid gap-2 text-sm text-muted sm:grid-cols-2">
          <li>Leads, Kunden, Termine</li>
          <li>Aktivitäten, Verträge, Rechnungen</li>
          <li>Provisionen und Freelancer-Rechnungen</li>
          <li>Verknüpfte Client-Hub-Daten (Notizen, Dateien, …)</li>
        </ul>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirmation("");
            setResetOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-red-500/15 px-4 py-2.5 text-sm font-medium text-red-200 ring-1 ring-red-500/25 transition-colors hover:bg-red-500/25"
        >
          <Trash2 className="h-4 w-4" />
          Testdaten zurücksetzen
        </button>
      </section>

      <section className="glass-card rounded-2xl p-6">
        <h2 className="mb-1 text-lg font-semibold text-foreground">
          Wartungsprotokoll
        </h2>
        <p className="mb-4 text-sm text-muted">
          Audit-Log für Testdaten-Resets mit Benutzer und Zeitstempel.
        </p>
        <ActivityFeed activities={auditLogs} />
      </section>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => {
          if (!confirmation) {
            setResetOpen(false);
            return;
          }
          setResetOpen(false);
          setConfirmation("");
        }}
        title="Testdaten unwiderruflich löschen?"
        description="Diese Aktion kann nicht rückgängig gemacht werden. Geben Sie zur Bestätigung exakt RESET TEST DATA ein."
        confirmLabel="Endgültig zurücksetzen"
        variant="danger"
        confirmDisabled={!canConfirm}
        onConfirm={handleReset}
      >
        <div className="space-y-3">
          <label className="block text-sm text-muted" htmlFor="reset-confirmation">
            Bestätigungstext
          </label>
          <input
            id="reset-confirmation"
            type="text"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={RESET_TEST_DATA_CONFIRMATION}
            className="dashboard-input w-full font-mono text-sm"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
