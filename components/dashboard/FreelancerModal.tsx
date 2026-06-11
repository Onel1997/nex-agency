"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  createFreelancer,
  updateFreelancer,
} from "@/app/dashboard/finance/freelancers/actions";
import { Modal } from "@/components/dashboard/Modal";
import type { FreelancerRecord } from "@/lib/dashboard/types";

interface FreelancerModalProps {
  freelancer: FreelancerRecord | null;
  open: boolean;
  onClose: () => void;
}

export function FreelancerModal({ freelancer, open, onClose }: FreelancerModalProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(freelancer);

  useEffect(() => {
    if (open) setError(null);
  }, [open, freelancer?.id]);

  if (!open) return null;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        if (isEdit && freelancer) {
          await updateFreelancer(freelancer.id, formData);
        } else {
          await createFreelancer(formData);
        }
        router.refresh();
        onClose();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Speichern fehlgeschlagen",
        );
      }
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Freelancer bearbeiten" : "Freelancer anlegen"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name *" name="name" defaultValue={freelancer?.name} required />
          <Field label="Firmenname" name="company_name" defaultValue={freelancer?.company_name ?? ""} />
          <Field label="Ansprechpartner" name="contact_person" defaultValue={freelancer?.contact_person ?? ""} />
          <Field label="E-Mail" name="email" type="email" defaultValue={freelancer?.email ?? ""} />
          <Field label="Telefon" name="phone" defaultValue={freelancer?.phone ?? ""} />
          <Field label="Straße" name="street" defaultValue={freelancer?.street ?? ""} />
          <Field label="PLZ" name="postal_code" defaultValue={freelancer?.postal_code ?? ""} />
          <Field label="Ort" name="city" defaultValue={freelancer?.city ?? ""} />
          <Field label="Land" name="country" defaultValue={freelancer?.country ?? "Deutschland"} />
          <Field label="Steuernummer" name="tax_number" defaultValue={freelancer?.tax_number ?? ""} />
          <Field label="USt-ID" name="vat_id" defaultValue={freelancer?.vat_id ?? ""} />
          <Field label="IBAN" name="iban" defaultValue={freelancer?.iban ?? ""} />
          <Field label="BIC" name="bic" defaultValue={freelancer?.bic ?? ""} />
          <Field
            label="Standard-Provisionssatz (%)"
            name="default_commission_rate"
            type="number"
            step="0.01"
            min="0"
            max="100"
            defaultValue={String(freelancer?.default_commission_rate ?? 0)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="is_active"
            value="true"
            defaultChecked={freelancer?.is_active ?? true}
            className="rounded border-border"
          />
          Aktiv
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
            {isPending ? "Speichern…" : "Speichern"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  step,
  min,
  max,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        step={step}
        min={min}
        max={max}
        className="dashboard-input w-full"
      />
    </label>
  );
}
