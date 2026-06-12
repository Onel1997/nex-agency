"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { payFreelancerPayout } from "@/app/dashboard/finance/actions";
import { Modal } from "@/components/dashboard/Modal";
import {
  centsToEuroInput,
  formatCents,
  formatDateTime,
} from "@/lib/dashboard/format";
import type { ClientRevenueRecord } from "@/lib/dashboard/types";

interface ClientFreelancerPayoutModalProps {
  client: ClientRevenueRecord | null;
  open: boolean;
  onClose: () => void;
}

export function ClientFreelancerPayoutModal({
  client,
  open,
  onClose,
}: ClientFreelancerPayoutModalProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!client || !open) return;
    setAmount(centsToEuroInput(client.freelancer_outstanding_cents));
    setError(null);
  }, [client, open]);

  if (!client || !open) return null;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await payFreelancerPayout(client.id, formData);
        router.refresh();
        onClose();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Auszahlung konnte nicht gespeichert werden",
        );
      }
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Freelancer auszahlen"
      layer="stacked"
      size="lg"
    >
      <dl className="mb-5 grid gap-3 sm:grid-cols-2">
        <InfoItem
          label="Freelancer"
          value={client.assigned_freelancer_name ?? "—"}
        />
        <InfoItem label="Kunde" value={client.company_name} />
        <InfoItem
          label="Gesamt-Auszahlung"
          value={formatCents(client.freelancer_payout_cents)}
        />
        <InfoItem
          label="Bereits ausgezahlt"
          value={formatCents(client.freelancer_paid_cents)}
        />
        <InfoItem
          label="Noch offen"
          value={formatCents(client.freelancer_outstanding_cents)}
          className="sm:col-span-2"
        />
      </dl>

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Auszahlungsbetrag (EUR)
          </span>
          <input
            name="payout_amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="dashboard-input"
            placeholder="0,00"
            required
            autoFocus
          />
        </label>

        {client.freelancer_payouts.length > 0 && (
          <div className="rounded-xl border border-border bg-black/20 p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-soft">
              Auszahlungshistorie
            </h3>
            <ul className="mt-3 space-y-2">
              {client.freelancer_payouts.map((payout) => (
                <li
                  key={payout.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-muted">
                    {formatDateTime(payout.paid_at)}
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    {formatCents(payout.amount_cents)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <button type="button" onClick={onClose} className="dashboard-btn-secondary">
            Abbrechen
          </button>
          <button type="submit" disabled={isPending} className="dashboard-btn-primary">
            {isPending ? "Speichern…" : "Auszahlung speichern"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function InfoItem({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-soft">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
