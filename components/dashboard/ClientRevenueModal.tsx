"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { updateClientContract } from "@/app/dashboard/clients/[id]/actions";
import { Modal } from "@/components/dashboard/Modal";
import {
  centsToEuroInput,
  formatCents,
  formatDateTime,
  parseEuroToCents,
} from "@/lib/dashboard/format";
import {
  buildRetainerPeriodViews,
  buildRetainerStats,
  formatRetainerPeriodStatus,
  hasActiveRetainer,
  retainerPeriodStatusClassName,
} from "@/lib/dashboard/retainer";
import { calculateCommissionCents } from "@/lib/dashboard/revenue";
import {
  COMMISSION_STATUSES,
  COMMISSION_STATUS_LABELS,
  CONTRACT_STATUSES,
  CONTRACT_STATUS_LABELS,
  type CommissionStatus,
  type ContractStatus,
} from "@/lib/dashboard/constants";
import type { ClientRevenueRecord, InvoiceRecord } from "@/lib/dashboard/types";
import { hasSetupInvoice } from "@/lib/dashboard/contract-invoices";
import { Check, Circle } from "lucide-react";

interface ClientRevenueModalProps {
  client: ClientRevenueRecord | null;
  invoices?: InvoiceRecord[];
  open: boolean;
  payoutOpen?: boolean;
  onClose: () => void;
  onRequestPayout: (client: ClientRevenueRecord) => void;
}

export function ClientRevenueModal({
  client,
  invoices = [],
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
    contractStatus: "draft" as ContractStatus,
    autoInvoiceEnabled: false,
    commissionStatus: "none" as CommissionStatus,
    createSetupInvoice: false,
  });

  const clientId = client?.id;

  useEffect(() => {
    if (!client || !open) return;
    setPreview({
      monthlyRevenue: centsToEuroInput(client.monthly_revenue_cents),
      setupFee: centsToEuroInput(client.setup_fee_cents),
      contractStartDate: client.contract_start_date ?? "",
      contractStatus: client.contract_status,
      autoInvoiceEnabled: client.auto_invoice_enabled,
      commissionStatus: client.commission_status,
      createSetupInvoice: false,
    });
    setError(null);
  }, [
    clientId,
    open,
    client?.monthly_revenue_cents,
    client?.setup_fee_cents,
    client?.contract_start_date,
    client?.contract_status,
    client?.auto_invoice_enabled,
    client?.commission_status,
    client,
  ]);

  if (!client) return null;

  const monthlyRevenueCents = parseEuroToCents(preview.monthlyRevenue);
  const setupFeeCents = parseEuroToCents(preview.setupFee);
  const retainerActive = hasActiveRetainer(monthlyRevenueCents);
  const canOfferSetupInvoice =
    (setupFeeCents ?? 0) > 0 && !hasSetupInvoice(invoices);
  const previewRetainerPeriods = retainerActive
    ? buildRetainerPeriodViews(
        preview.contractStartDate || null,
        monthlyRevenueCents,
        client.retainer_invoices ?? [],
      )
    : [];

  const previewStats = buildRetainerStats({
    contract_start_date: preview.contractStartDate || null,
    contract_status: preview.contractStatus,
    setup_fee_cents: setupFeeCents,
    monthly_revenue_cents: monthlyRevenueCents,
    retainerInvoices: client.retainer_invoices ?? [],
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
      contractStatus: String(formData.get("contract_status") ?? "draft") as ContractStatus,
      autoInvoiceEnabled: formData.get("auto_invoice_enabled") === "on",
      commissionStatus: String(formData.get("commission_status") ?? "none") as CommissionStatus,
      createSetupInvoice: formData.get("create_setup_invoice") === "on",
    });
  };

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await updateClientContract(client.id, formData);
        onClose();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
      }
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Vertrag — ${client.company_name}`}
      size="lg"
      closeOnEscape={!payoutOpen}
      closeOnBackdrop={!payoutOpen}
    >
      <p className="mb-4 text-sm text-muted">
        Zentrale Vertragsverwaltung. Rechnungen erstellen und verwalten Sie im Tab
        Rechnungen.
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

          <Field label="Monatlicher Retainer (EUR)">
            <input
              name="monthly_revenue"
              type="text"
              inputMode="decimal"
              defaultValue={centsToEuroInput(client.monthly_revenue_cents)}
              className="dashboard-input"
              placeholder="0,00"
            />
          </Field>

          <Field label="Vertragsbeginn">
            <input
              name="contract_start_date"
              type="date"
              defaultValue={client.contract_start_date ?? ""}
              className="dashboard-input"
            />
          </Field>

          <Field label="Vertragsstatus">
            <select
              name="contract_status"
              defaultValue={client.contract_status}
              className="dashboard-input"
            >
              {CONTRACT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {CONTRACT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Provision (Status)">
            <select
              name="commission_status"
              defaultValue={client.commission_status}
              className="dashboard-input"
            >
              {COMMISSION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {COMMISSION_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </Field>

          {retainerActive && (
            <label className="flex items-center gap-3 self-end">
              <input
                type="checkbox"
                name="auto_invoice_enabled"
                checked={preview.autoInvoiceEnabled}
                onChange={(event) =>
                  setPreview((current) => ({
                    ...current,
                    autoInvoiceEnabled: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-border bg-transparent"
              />
              <span className="text-sm text-muted">
                Automatische Retainer-Abrechnung aktiv
              </span>
            </label>
          )}

          {canOfferSetupInvoice && (
            <label className="flex items-center gap-3 sm:col-span-2">
              <input
                type="checkbox"
                name="create_setup_invoice"
                checked={preview.createSetupInvoice}
                onChange={(event) =>
                  setPreview((current) => ({
                    ...current,
                    createSetupInvoice: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-border bg-transparent"
              />
              <span className="text-sm text-muted">
                Setup-Rechnung sofort erstellen (Entwurf)
              </span>
            </label>
          )}
        </div>

        {retainerActive ? (
          <div className="rounded-xl border border-border bg-black/20 p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-soft">
              Retainer-Übersicht
            </h3>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <StatItem label="Monate aktiv" value={String(previewStats.months_active)} />
              <StatItem label="Monate bezahlt" value={String(previewStats.months_paid)} />
              <StatItem label="Monate offen" value={String(previewStats.months_open)} />
              <StatItem
                label="Nächste Zahlung fällig"
                value={previewStats.next_payment_due ?? "—"}
              />
            </dl>
          </div>
        ) : null}

        {retainerActive && previewRetainerPeriods.length > 0 && (
          <div className="rounded-xl border border-border bg-black/20 p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-soft">
              Retainer-Perioden
            </h3>
            <p className="mt-1 text-xs text-muted-soft">
              Bezahlt-Status wird automatisch gesetzt, wenn Retainer-Rechnungen als
              bezahlt markiert werden.
            </p>
            <ul className="mt-3 space-y-2">
              {previewRetainerPeriods.map((period) => (
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
                  </div>
                  <span
                    className={`text-xs ${retainerPeriodStatusClassName(period.status)}`}
                  >
                    {formatRetainerPeriodStatus(period.status)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

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
            Setup (aktiver Vertrag) + bezahlte Retainer-Perioden
          </p>
          <p className="mt-2">
            Setup-Provision ({client.commission_rate}%):{" "}
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
            Provisionsauszahlung
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
