import { createClient } from "@/lib/supabase/server";

function isDueDateSchemaMissingError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("due_date") && normalized.includes("does not exist");
}

export async function syncOverdueInvoices(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_overdue_invoices");

  if (error) {
    if (isDueDateSchemaMissingError(error.message)) return;

    const today = new Date().toISOString().slice(0, 10);
    const { error: fallbackError } = await supabase
      .from("invoices")
      .update({ status: "overdue", updated_at: new Date().toISOString() })
      .neq("status", "paid")
      .neq("status", "cancelled")
      .neq("status", "overdue")
      .lt("due_date", today);

    if (fallbackError && !isDueDateSchemaMissingError(fallbackError.message)) {
      console.error("Overdue invoice sync failed:", fallbackError.message);
    }
  }
}
