import { ExpensesPageClient } from "@/components/dashboard/ExpensesPageClient";
import { computeExpenseStats, getAllExpenses } from "@/lib/dashboard/expenses";
import type { ExpenseRecord } from "@/lib/dashboard/types";

export default async function ExpensesPage() {
  let expenses: ExpenseRecord[] = [];
  let monthlyExpensesCents = 0;
  let yearlyExpensesCents = 0;
  let error: string | null = null;

  try {
    expenses = await getAllExpenses();
    const stats = computeExpenseStats(expenses);
    monthlyExpensesCents = stats.monthlyExpensesCents;
    yearlyExpensesCents = stats.yearlyExpensesCents;
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Ausgaben konnten nicht geladen werden";
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
        {error}
      </div>
    );
  }

  return (
    <ExpensesPageClient
      expenses={expenses}
      monthlyExpensesCents={monthlyExpensesCents}
      yearlyExpensesCents={yearlyExpensesCents}
    />
  );
}
