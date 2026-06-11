"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  createExpense,
  updateExpense,
} from "@/app/dashboard/finance/expenses/actions";
import { Modal } from "@/components/dashboard/Modal";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from "@/lib/dashboard/constants";
import { centsToEuroInput } from "@/lib/dashboard/format";
import type { ExpenseRecord } from "@/lib/dashboard/types";

interface ExpenseModalProps {
  expense: ExpenseRecord | null;
  open: boolean;
  onClose: () => void;
}

export function ExpenseModal({ expense, open, onClose }: ExpenseModalProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(expense);

  useEffect(() => {
    if (open) setError(null);
  }, [open, expense?.id]);

  if (!open) return null;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        if (isEdit && expense) {
          await updateExpense(expense.id, formData);
        } else {
          await createExpense(formData);
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
      title={isEdit ? "Ausgabe bearbeiten" : "Ausgabe erfassen"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">Titel *</span>
          <input
            name="title"
            required
            defaultValue={expense?.title ?? ""}
            className="dashboard-input w-full"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Betrag (EUR) *</span>
            <input
              name="amount"
              required
              defaultValue={expense ? centsToEuroInput(expense.amount_cents) : ""}
              placeholder="0,00"
              className="dashboard-input w-full"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Datum *</span>
            <input
              name="expense_date"
              type="date"
              required
              defaultValue={expense?.expense_date ?? new Date().toISOString().slice(0, 10)}
              className="dashboard-input w-full"
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">Kategorie *</span>
          <select
            name="category"
            required
            defaultValue={expense?.category ?? "other"}
            className="dashboard-input w-full"
          >
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {EXPENSE_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">Notiz</span>
          <textarea
            name="note"
            rows={3}
            defaultValue={expense?.note ?? ""}
            className="dashboard-input w-full resize-y"
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
            {isPending ? "Speichern…" : "Speichern"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
