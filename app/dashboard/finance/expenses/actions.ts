"use server";

import { revalidatePath } from "next/cache";
import { requireFinanceAccess } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/session";
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
} from "@/lib/dashboard/constants";
import { parseEuroToCents } from "@/lib/dashboard/format";
import { isExpenseSchemaMissingError } from "@/lib/dashboard/expenses";
import { createClient } from "@/lib/supabase/server";

function revalidateExpensePaths() {
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard/finance/expenses");
}

export async function createExpense(formData: FormData) {
  await requireFinanceAccess();
  const profile = await getProfile();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Titel ist erforderlich");

  const amountCents = parseEuroToCents(String(formData.get("amount") ?? ""));
  if (amountCents == null || amountCents <= 0) {
    throw new Error("Bitte einen gültigen Betrag eingeben");
  }

  const category = String(formData.get("category") ?? "") as ExpenseCategory;
  if (!EXPENSE_CATEGORIES.includes(category)) {
    throw new Error("Ungültige Kategorie");
  }

  const expenseDate = String(formData.get("expense_date") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    title,
    amount_cents: amountCents,
    expense_date: expenseDate || new Date().toISOString().slice(0, 10),
    category,
    note,
    created_by: profile?.id ?? null,
  });

  if (error) {
    if (isExpenseSchemaMissingError(error.message)) {
      throw new Error(
        "Ausgaben sind erst nach Anwenden der Phase-14-Migration verfügbar.",
      );
    }
    throw new Error(error.message);
  }

  revalidateExpensePaths();
}

export async function updateExpense(expenseId: string, formData: FormData) {
  await requireFinanceAccess();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Titel ist erforderlich");

  const amountCents = parseEuroToCents(String(formData.get("amount") ?? ""));
  if (amountCents == null || amountCents <= 0) {
    throw new Error("Bitte einen gültigen Betrag eingeben");
  }

  const category = String(formData.get("category") ?? "") as ExpenseCategory;
  if (!EXPENSE_CATEGORIES.includes(category)) {
    throw new Error("Ungültige Kategorie");
  }

  const expenseDate = String(formData.get("expense_date") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("expenses")
    .update({
      title,
      amount_cents: amountCents,
      expense_date: expenseDate,
      category,
      note,
    })
    .eq("id", expenseId);

  if (error) throw new Error(error.message);
  revalidateExpensePaths();
}

export async function deleteExpense(expenseId: string) {
  await requireFinanceAccess();

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);

  if (error) throw new Error(error.message);
  revalidateExpensePaths();
}
