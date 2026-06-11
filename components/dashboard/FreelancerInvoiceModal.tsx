"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createFreelancerInvoice } from "@/app/dashboard/finance/freelancers/actions";
import { Modal } from "@/components/dashboard/Modal";

interface FreelancerInvoiceModalProps {
  freelancerId: string;
  freelancerName: string;
  open: boolean;
  onClose: () => void;
}

export function FreelancerInvoiceModal({
  freelancerId,
  freelancerName,
  open,
  onClose,
}: FreelancerInvoiceModalProps) {
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
        await createFreelancerInvoice(freelancerId, formData);
        router.refresh();
        onClose();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Rechnung konnte nicht erstellt werden",
        );
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={`Rechnung — ${freelancerName}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">Leistungsbeschreibung *</span>
          <textarea
            name="description"
            required
            rows={4}
            className="dashboard-input w-full resize-y"
            placeholder="Beschreibung der erbrachten Leistung"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">Nettobetrag (EUR) *</span>
          <input
            name="subtotal"
            type="text"
            required
            placeholder="0,00"
            className="dashboard-input w-full"
          />
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
            {isPending ? "Erstellen…" : "Rechnung erstellen"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
