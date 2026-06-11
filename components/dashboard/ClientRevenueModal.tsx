"use client";

import { useState, useTransition } from "react";
import {
  updateClientRevenue,
  updateCommissionStatus,
} from "@/app/dashboard/finance/actions";
import { Modal } from "@/components/dashboard/Modal";
import {
  COMMISSION_STATUSES,
  COMMISSION_STATUS_LABELS,
  type CommissionStatus,
} from "@/lib/dashboard/constants";
import { centsToEuroInput } from "@/lib/dashboard/format";
import type { ClientRevenueRecord } from "@/lib/dashboard/types";

interface ClientRevenueModalProps {
  client: ClientRevenueRecord | null;
  open: boolean;
  onClose: () => void;
}

export function ClientRevenueModal({
  client,
  open,
  onClose,
}: ClientRevenueModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!client) return null;

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await updateClientRevenue(client.id, formData);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
      }
    });
  };

  const handleStatusChange = (status: CommissionStatus) => {
    setError(null);
    startTransition(async () => {
      try {
        await updateCommissionStatus(client.id, status);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Status konnte nicht gespeichert werden");
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={`Umsatz — ${client.company_name}`}>
      <p className="mb-4 text-sm text-muted">
        Monatlicher Umsatz, Setup-Gebühr und Provisionsstatus verwalten.
      </p>
      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        <Field label="Monatlicher Umsatz (EUR)">
          <input
            name="monthly_revenue"
            type="text"
            inputMode="decimal"
            defaultValue={centsToEuroInput(client.monthly_revenue_cents)}
            className="dashboard-input"
            placeholder="0,00"
          />
        </Field>

        <Field label="Setup-Gebühr (EUR)">
          <input
            name="setup_fee"
            type="text"
            inputMode="decimal"
            defaultValue={centsToEuroInput(client.setup_fee_cents)}
            className="dashboard-input"
            placeholder="0,00"
          />
        </Field>

        <Field label="Gesamtumsatz (EUR)">
          <input
            name="total_revenue"
            type="text"
            inputMode="decimal"
            defaultValue={centsToEuroInput(client.total_revenue_cents)}
            className="dashboard-input"
            placeholder="Leer = automatisch berechnet"
          />
        </Field>

        <div className="rounded-xl bg-white/[0.03] px-4 py-3 text-sm text-muted">
          <p>
            Provision ({client.commission_rate}%):{" "}
            <span className="font-medium text-foreground">
              {client.commission_cents > 0
                ? `${(client.commission_cents / 100).toLocaleString("de-DE", {
                    style: "currency",
                    currency: "EUR",
                  })}`
                : "—"}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {COMMISSION_STATUSES.filter((s) => s !== "none").map((status) => (
            <button
              key={status}
              type="button"
              disabled={isPending}
              onClick={() => handleStatusChange(status)}
              className={`dashboard-btn-secondary text-xs ${
                client.commission_status === status ? "ring-1 ring-violet-500/40" : ""
              }`}
            >
              {COMMISSION_STATUS_LABELS[status]}
            </button>
          ))}
        </div>

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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
