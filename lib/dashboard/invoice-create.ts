import type { SupabaseClient } from "@supabase/supabase-js";
import type { InvoiceStatus, InvoiceType } from "./constants";
import { computeInvoiceDueDate } from "./invoice-dates";
import { calculateInvoiceAmounts } from "./invoice-math";

async function reserveInvoiceNumber(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.rpc("next_invoice_number");
  if (error) throw new Error(error.message);
  return data as string;
}

export interface CreateInvoiceParams {
  clientId: string;
  contractId?: string | null;
  profileId?: string | null;
  subtotalCents: number;
  status: InvoiceStatus;
  description: string;
  invoiceType?: InvoiceType | null;
  billingPeriodYear?: number | null;
  billingPeriodMonth?: number | null;
  invoiceDate?: Date;
}

export async function createInvoiceRecord(
  supabase: SupabaseClient,
  params: CreateInvoiceParams,
) {
  const amounts = calculateInvoiceAmounts(params.subtotalCents);
  const invoiceNumber = await reserveInvoiceNumber(supabase);
  const invoiceDate = params.invoiceDate ?? new Date();

  const insertPayload: Record<string, unknown> = {
    client_id: params.clientId,
    contract_id: params.contractId ?? null,
    invoice_number: invoiceNumber,
    amount_cents: amounts.totalAmountCents,
    status: params.status,
    created_by: params.profileId ?? null,
    due_date: computeInvoiceDueDate(invoiceDate),
    subtotal_cents: amounts.subtotalCents,
    tax_amount_cents: amounts.taxAmountCents,
    total_amount_cents: amounts.totalAmountCents,
    vat_rate: amounts.vatRate,
    invoice_type: params.invoiceType ?? null,
    billing_period_year: params.billingPeriodYear ?? null,
    billing_period_month: params.billingPeriodMonth ?? null,
  };

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert(insertPayload)
    .select("id, invoice_number")
    .single();

  if (error) throw new Error(error.message);

  const { error: itemError } = await supabase.from("invoice_items").insert({
    invoice_id: invoice.id,
    description: params.description,
    quantity: 1,
    unit_price_cents: amounts.subtotalCents,
    line_total_cents: amounts.subtotalCents,
    sort_order: 0,
  });

  if (itemError && !itemError.message.includes("invoice_items")) {
    throw new Error(itemError.message);
  }

  return {
    invoiceId: invoice.id as string,
    invoiceNumber: invoice.invoice_number as string,
    totalAmountCents: amounts.totalAmountCents,
  };
}
