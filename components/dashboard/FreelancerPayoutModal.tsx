"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createFreelancerPayout } from "@/app/dashboard/finance/payouts/actions";
import { Modal } from "@/components/dashboard/Modal";
import type { ClientRecord, FreelancerRecord } from "@/lib/dashboard/types";

interface FreelancerPayoutModalProps {
  freelancers: FreelancerRecord[];
  clients: ClientRecord[];
  open: boolean;
  onClose: () => void;
  defaultFreelancerId?: string;
}

export function FreelancerPayoutModal({
  freelancers,
  clients,
  open,
  onClose,
  defaultFreelancerId,
}: FreelancerPayoutModalProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await createFreelancerPayout(formData);
        router.refresh();
        onClose();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Auszahlung konnte nicht erstellt werden",
        );
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Auszahlung erfassen" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">Freelancer *</span>
          <select
            name="freelancer_id"
            required
            defaultValue={defaultFreelancerId ?? ""}
            className="dashboard-input w-full"
          >
            <option value="" disabled>
              Bitte wählen
            </option>
            {freelancers.map((freelancer) => (
              <option key={freelancer.id} value={freelancer.id}>
                {freelancer.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Betrag (EUR) *</span>
            <input name="amount" required placeholder="0,00" className="dashboard-input w-full" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Datum *</span>
            <input
              name="payout_date"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="dashboard-input w-full"
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">Zugehörige Projekte</span>
          <select
            name="client_ids"
            multiple
            size={5}
            className="dashboard-input w-full"
          >
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.company_name}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-soft">Strg/Cmd für Mehrfachauswahl</span>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">Notiz</span>
          <textarea name="notes" rows={3} className="dashboard-input w-full resize-y" />
        </label>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/20">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="dashboard-btn-secondary">
            Abbrechen
          </button>
          <button type="submit" disabled={isPending} className="dashboard-btn-primary">
            {isPending ? "Speichern…" : "Auszahlung anlegen"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
