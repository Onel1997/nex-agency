import { createClient } from "@/lib/supabase/server";
import { isClientHubSchemaMissingError } from "./client-activities";
import type { InvoiceStatus } from "./constants";
import type { InvoiceRecord } from "./types";

export async function getInvoicesForClient(
  clientId: string,
): Promise<InvoiceRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(
      `
      id,
      client_id,
      invoice_number,
      amount_cents,
      status,
      created_by,
      created_at,
      updated_at
    `,
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isClientHubSchemaMissingError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    client_id: row.client_id as string,
    invoice_number: row.invoice_number as string,
    amount_cents: row.amount_cents as number,
    status: row.status as InvoiceStatus,
    created_by: (row.created_by as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }));
}

export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .like("invoice_number", `RE-${year}-%`);

  if (error) {
    if (isClientHubSchemaMissingError(error.message)) {
      return `RE-${year}-0001`;
    }
    throw new Error(error.message);
  }

  const next = (count ?? 0) + 1;
  return `RE-${year}-${String(next).padStart(4, "0")}`;
}
