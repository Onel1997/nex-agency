"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  updateClientRevenue,
  updateRetainerPaymentStatus,
} from "@/app/dashboard/finance/actions";
import { Modal } from "@/components/dashboard/Modal";
import {
  centsToEuroInput,
  formatCents,
  formatDateTime,
  parseEuroToCents,
} from "@/lib/dashboard/format";
import { buildRetainerStats } from "@/lib/dashboard/retainer";
import { calculateCommissionCents } from "@/lib/dashboard/revenue";
import type { ClientRevenueRecord } from "@/lib/dashboard/types";
import { Check, Circle } from "lucide-react";

interface ClientRevenueModalProps {
  client: ClientRevenueRecord | null;
  open: boolean;
  payoutOpen?: boolean;
  onClose: () => void;
  onRequestPayout: (client: ClientRevenueRecord) => void;
}

export function ClientRevenueModal({
  client,
  open,
  payoutOpen = false,
  onClose,
  onRequestPayout,
}: ClientRevenueModalProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState({
    monthlyRevenue: "",
    setupFee: "",
    contractStartDate: "",
  });

  const clientId = client?.id;

  useEffect(() => {
    if (!client || !open) return;
    setPreview({
      monthlyRevenue: centsToEuroInput(client.monthly_revenue_cents),
      setupFee: centsToEuroInput(client.setup_fee_cents),
      contractStartDate: client.contract_start_date ?? "",
    });
    setError(null);
  }, [
    clientId,
    open,
    client?.monthly_revenue_cents,
    client?.setup_fee_cents,
    client?.contract_start_date,
    client,
  ]);

  if (!client) return null;

  const monthlyRevenueCents = parseEuroToCents(preview.monthlyRevenue);
  const setupFeeCents = parseEuroToCents(preview.setupFee);
  const previewStats = buildRetainerStats({
    contract_start_date: preview.contractStartDate || null,
    setup_fee_cents: setupFeeCents,
    monthly_revenue_cents: monthlyRevenueCents,
    payments: client.retainer_periods.map((period) => ({
      period_year: period.period_year,
      period_month: period.period_month,
      status: period.status,
    })),
  });
  const previewTotalRevenueCents = previewStats.total_revenue_cents;
  const previewCommissionCents = calculateCommissionCents(
    setupFeeCents,
    client.commission_rate,
  );

  const updatePreview = (form: HTMLFormElement) => {
    const formData = new FormData(form);
    setPreview({
      monthlyRevenue: String(formData.get("monthly_revenue") ?? ""),
      setupFee: String(formData.get("setup_fee") ?? ""),
      contractStartDate: String(formData.get("contract_start_date") ?? ""),
    });
  };

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

  const handlePaymentToggle = (
    periodYear: number,
    periodMonth: number,
    nextStatus: "paid" | "open",
  ) => {
    setError(null);
    startTransition(async () => {
      try {
        await updateRetainerPaymentStatus(
          client.id,
          periodYear,
          periodMonth,
          nextStatus,
        );
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Zahlungsstatus konnte nicht gespeichert werden",
        );
      }
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Vertrag & Umsatz — ${client.company_name}`}
      size="lg"
      closeOnEscape={!payoutOpen}
      closeOnBackdrop={!payoutOpen}
    >
      <p className="mb-4 text-sm text-muted">
        Setup-Gebühr, monatlicher Retainer, Vertragsbeginn und Zahlungsverlauf verwalten.
      </p>
      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </div>
      )}

      <form
        action={handleSubmit}
        className="space-y-5"
        onChange={(e) => updatePreview(e.currentTarget)}
        onInput={(e) => updatePreview(e.currentTarget)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
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

          <Field label="Monatlicher Betrag (EUR)">
            <input
              name="monthly_revenue"
              type="text"
              inputMode="decimal"
              defaultValue={centsToEuroInput(client.monthly_revenue_cents)}
              className="dashboard-input"
              placeholder="0,00"
            />
          </Field>

          <Field label="Vertragsbeginn" className="sm:col-span-2">
            <input
              name="contract_start_date"
              type="date"
              defaultValue={client.contract_start_date ?? ""}
              className="dashboard-input"
              required
            />
          </Field>
        </div>

        <div className="rounded-xl border border-border bg-black/20 p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-soft">
            Retainer-Übersicht
          </h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <StatItem label="Monate aktiv" value={String(client.months_active)} />
            <StatItem label="Monate bezahlt" value={String(client.months_paid)} />
            <StatItem label="Monate offen" value={String(client.months_open)} />
            <StatItem
              label="Nächste Zahlung fällig"
              value={client.next_payment_due ?? "—"}
            />
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-black/20 p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-soft">
            Zahlungsverlauf
          </h3>
          {client.retainer_periods.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Vertragsbeginn speichern, um Retainer-Monate zu erzeugen.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {client.retainer_periods.map((period) => (
                <li
                  key={`${period.period_year}-${period.period_month}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2"
                >
                  <div className="flex items-center gap-2 text-sm">
                    {period.status === "paid" ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-soft" />
                    )}
                    <span className="text-foreground">{period.label}</span>
                    <span className="text-xs text-muted-soft">
                      {period.status === "paid" ? "bezahlt" : "offen"}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      handlePaymentToggle(
                        period.period_year,
                        period.period_month,
                        period.status === "paid" ? "open" : "paid",
                      )
                    }
                    className="dashboard-btn-secondary px-3 py-1 text-xs"
                  >
                    {period.status === "paid" ? "Als offen" : "Als bezahlt"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl bg-white/[0.03] px-4 py-3 text-sm text-muted">
          <p>
            Gesamtumsatz:{" "}
            <span className="font-medium text-foreground">
              {(previewTotalRevenueCents / 100).toLocaleString("de-DE", {
                style: "currency",
                currency: "EUR",
              })}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-soft">
            Setup + (Monatlich × bezahlte Monate)
          </p>
          <p className="mt-2">
            Aktuelle Setup-Provision ({client.commission_rate}%):{" "}
            <span className="font-medium text-foreground">
              {previewCommissionCents > 0
                ? (previewCommissionCents / 100).toLocaleString("de-DE", {
                    style: "currency",
                    currency: "EUR",
                  })
                : "—"}
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-border bg-black/20 p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-soft">
            Provisionsverwaltung
          </h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            <StatItem
              label="Gesamt verdient"
              value={formatCents(client.commission_total_cents)}
            />
            <StatItem
              label="Bereits ausgezahlt"
              value={formatCents(client.commission_paid_cents)}
            />
            <StatItem
              label="Noch offen"
              value={formatCents(client.commission_outstanding_cents)}
            />
          </dl>

          {client.commission_payouts.length > 0 && (
            <div className="mt-4 border-t border-border/70 pt-4">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-soft">
                Auszahlungshistorie
              </h4>
              <ul className="mt-2 space-y-1.5">
                {client.commission_payouts.map((payout) => (
                  <li
                    key={payout.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-muted">
                      {formatDateTime(payout.payout_date)}
                    </span>
                    <span className="font-medium tabular-nums text-foreground">
                      {formatCents(payout.amount_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            disabled={isPending || client.commission_outstanding_cents <= 0}
            onClick={() => onRequestPayout(client)}
            className="dashboard-btn-secondary mt-4 text-sm"
          >
            Provision auszahlen
          </button>
          {client.commission_total_cents > 0 &&
            client.commission_outstanding_cents <= 0 && (
              <p className="mt-2 text-xs text-muted-soft">
                Keine offene Provision — Auszahlung bereits vollständig erfasst.
              </p>
            )}
        </div>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <button type="button" onClick={onClose} className="dashboard-btn-secondary">
            Abbrechen
          </button>
          <button type="submit" disabled={isPending} className="dashboard-btn-primary">
            {isPending ? "Speichern…" : "Vertragsdaten speichern"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-soft">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
