import { canAccessFinanceRoutes } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import type { ExpenseRecord } from "./types";
import { createClient } from "@/lib/supabase/server";

export function isExpenseSchemaMissingError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("could not find the table") ||
    normalized.includes("expenses")
  );
}

function mapExpenseRow(row: Record<string, unknown>): ExpenseRecord {
  return {
    id: row.id as string,
    title: row.title as string,
    amount_cents: row.amount_cents as number,
    expense_date: row.expense_date as string,
    category: row.category as ExpenseRecord["category"],
    note: (row.note as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function getAllExpenses(): Promise<ExpenseRecord[]> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) {
    throw new Error("Keine Berechtigung");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("expense_date", { ascending: false });

  if (error) {
    if (isExpenseSchemaMissingError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapExpenseRow(row));
}

export function computeExpenseStats(expenses: ExpenseRecord[]): {
  monthlyExpensesCents: number;
  yearlyExpensesCents: number;
  totalExpensesCents: number;
} {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  let monthlyExpensesCents = 0;
  let yearlyExpensesCents = 0;
  let totalExpensesCents = 0;

  for (const expense of expenses) {
    totalExpensesCents += expense.amount_cents;
    const date = new Date(`${expense.expense_date}T12:00:00`);
    if (date.getFullYear() === year) {
      yearlyExpensesCents += expense.amount_cents;
      if (date.getMonth() === month) {
        monthlyExpensesCents += expense.amount_cents;
      }
    }
  }

  return { monthlyExpensesCents, yearlyExpensesCents, totalExpensesCents };
}
