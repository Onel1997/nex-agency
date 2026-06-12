"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Receipt } from "lucide-react";
import { deleteExpense } from "@/app/dashboard/finance/expenses/actions";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ExpenseModal } from "@/components/dashboard/ExpenseModal";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/dashboard/constants";
import { formatCents, formatDate } from "@/lib/dashboard/format";
import type { ExpenseRecord } from "@/lib/dashboard/types";
import { CalendarDays, Euro } from "lucide-react";

interface ExpensesPageClientProps {
  expenses: ExpenseRecord[];
  monthlyExpensesCents: number;
  yearlyExpensesCents: number;
}

export function ExpensesPageClient({
  expenses,
  monthlyExpensesCents,
  yearlyExpensesCents,
}: ExpensesPageClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRecord | null>(null);
  const [isPending, startTransition] = useTransition();

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (expense: ExpenseRecord) => {
    setEditing(expense);
    setModalOpen(true);
  };

  const handleDelete = (expenseId: string) => {
    if (!confirm("Ausgabe wirklich löschen?")) return;
    startTransition(async () => {
      await deleteExpense(expenseId);
      router.refresh();
    });
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <DashboardHeader
          title="Ausgaben"
          description="Agenturkosten nach Kategorie erfassen und für die Gewinnberechnung nutzen."
        />
        <button type="button" onClick={openCreate} className="dashboard-btn-primary">
          Ausgabe erfassen
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          label="Monatskosten"
          value={formatCents(monthlyExpensesCents)}
          icon={CalendarDays}
          trend="Aktueller Monat"
        />
        <KpiCard
          label="Jahreskosten"
          value={formatCents(yearlyExpensesCents)}
          icon={Euro}
          trend="Aktuelles Jahr"
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Ausgabenliste
        </h2>
        <p className="mt-1 text-sm text-muted">
          Alle erfassten Agenturkosten nach Datum sortiert.
        </p>
      </div>

      <DataTable
        columns={[
          {
            key: "title",
            header: "Titel",
            render: (expense) => (
              <div>
                <div className="font-medium text-foreground">{expense.title}</div>
                {expense.note && (
                  <div className="text-xs text-muted-soft">{expense.note}</div>
                )}
              </div>
            ),
          },
          {
            key: "category",
            header: "Kategorie",
            hideOnMobile: true,
            render: (expense) => EXPENSE_CATEGORY_LABELS[expense.category],
          },
          {
            key: "date",
            header: "Datum",
            hideOnMobile: true,
            render: (expense) => formatDate(`${expense.expense_date}T12:00:00`),
          },
          {
            key: "amount",
            header: "Betrag",
            className: "text-right",
            render: (expense) => formatCents(expense.amount_cents),
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            render: (expense) => (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(expense)}
                  className="dashboard-link text-xs"
                >
                  Bearbeiten
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDelete(expense.id)}
                  className="text-xs text-red-300 hover:text-red-200"
                >
                  Löschen
                </button>
              </div>
            ),
          },
        ]}
        data={expenses}
        rowKey={(expense) => expense.id}
        emptyState={
          <EmptyState
            icon={Receipt}
            title="Keine Ausgaben"
            description="Erfassen Sie die erste Agenturausgabe."
          />
        }
      />

      <ExpenseModal
        expense={editing}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
