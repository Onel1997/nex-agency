import { createClient } from "@/lib/supabase/server";
import { isClientHubSchemaMissingError } from "./client-activities";
import type { InvoiceStatus } from "./constants";
import { calculateInvoiceAmounts, DEFAULT_VAT_RATE } from "./invoice-math";
import { syncOverdueInvoices } from "./invoice-overdue";
import {
  filterContractInvoicesForClient,
  filterInvoicesForClient,
} from "./contract-invoices";
import type { InvoiceItemRecord, InvoiceRecord, InvoiceWithDetails } from "./types";

export { resolveInvoiceType } from "./invoice-type";

export {
  filterContractInvoicesForClient,
  filterInvoicesForClient,
} from "./contract-invoices";

function isPhase10InvoiceSchemaMissingError(message: string) {
  const normalized = message.toLowerCase();
  return (
    isClientHubSchemaMissingError(message) ||
    (normalized.includes("does not exist") &&
      (normalized.includes("subtotal_cents") ||
        normalized.includes("contract_id") ||
        normalized.includes("invoice_items") ||
        normalized.includes("customer_number") ||
        normalized.includes("next_invoice_number") ||
        normalized.includes("due_date")))
  );
}

export async function reserveInvoiceNumber(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("next_invoice_number");

  if (error) {
    if (isPhase10InvoiceSchemaMissingError(error.message)) {
      return legacyGenerateInvoiceNumber();
    }
    throw new Error(error.message);
  }

  return data as string;
}

async function legacyGenerateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .like("invoice_number", `RE-${year}-%`);

  if (error) throw new Error(error.message);
  const next = (count ?? 0) + 1;
  return `RE-${year}-${String(next).padStart(6, "0")}`;
}

/** @deprecated Use reserveInvoiceNumber */
export async function generateInvoiceNumber(): Promise<string> {
  return reserveInvoiceNumber();
}

function mapInvoiceRow(row: Record<string, unknown>): InvoiceRecord {
  const subtotal =
    (row.subtotal_cents as number | null) ??
    (row.amount_cents as number | null) ??
    0;
  const tax =
    (row.tax_amount_cents as number | null) ??
    Math.round(subtotal * (DEFAULT_VAT_RATE / 100));
  const total =
    (row.total_amount_cents as number | null) ??
    (row.amount_cents as number | null) ??
    subtotal + tax;

  return {
    id: row.id as string,
    client_id: row.client_id as string,
    contract_id: (row.contract_id as string | null | undefined) ?? null,
    invoice_type: (row.invoice_type as InvoiceRecord["invoice_type"]) ?? null,
    billing_period_year: (row.billing_period_year as number | null | undefined) ?? null,
    billing_period_month: (row.billing_period_month as number | null | undefined) ?? null,
    invoice_number: row.invoice_number as string,
    amount_cents: total,
    subtotal_cents: subtotal,
    tax_amount_cents: tax,
    total_amount_cents: total,
    vat_rate: Number(row.vat_rate ?? DEFAULT_VAT_RATE),
    status: row.status as InvoiceStatus,
    created_by: (row.created_by as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    due_date: (row.due_date as string | null | undefined) ?? null,
    company_name: (row.company_name as string | undefined) ?? undefined,
    customer_number: (row.customer_number as string | null | undefined) ?? null,
  };
}

const INVOICE_SELECT = `
  id,
  client_id,
  contract_id,
  invoice_type,
  billing_period_year,
  billing_period_month,
  invoice_number,
  amount_cents,
  subtotal_cents,
  tax_amount_cents,
  total_amount_cents,
  vat_rate,
  status,
  created_by,
  created_at,
  updated_at,
  due_date
`;

export async function getInvoicesForClient(
  clientId: string,
): Promise<InvoiceRecord[]> {
  await syncOverdueInvoices();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isPhase10InvoiceSchemaMissingError(error.message)) {
      return getInvoicesForClientLegacy(clientId);
    }
    throw new Error(error.message);
  }

  return filterInvoicesForClient(
    (data ?? []).map((row) => mapInvoiceRow(row as Record<string, unknown>)),
    clientId,
  );
}

export async function getContractInvoicesForClient(
  clientId: string,
  contractId?: string | null,
): Promise<InvoiceRecord[]> {
  await syncOverdueInvoices();

  const supabase = await createClient();
  let query = supabase
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("client_id", clientId);

  if (contractId) {
    query = query.eq("contract_id", contractId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    if (isPhase10InvoiceSchemaMissingError(error.message)) {
      const legacy = await getInvoicesForClientLegacy(clientId);
      return filterContractInvoicesForClient(legacy, { clientId, contractId });
    }
    throw new Error(error.message);
  }

  return filterContractInvoicesForClient(
    (data ?? []).map((row) => mapInvoiceRow(row as Record<string, unknown>)),
    { clientId, contractId },
  );
}

async function getInvoicesForClientLegacy(
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

  return filterInvoicesForClient(
    (data ?? []).map((row) => mapInvoiceRow(row as Record<string, unknown>)),
    clientId,
  );
}

export async function getAllInvoices(): Promise<InvoiceRecord[]> {
  await syncOverdueInvoices();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(
      `
      ${INVOICE_SELECT},
      client:clients!invoices_client_id_fkey(company_name, customer_number)
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    if (isPhase10InvoiceSchemaMissingError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const client = Array.isArray(row.client) ? row.client[0] : row.client;
    return mapInvoiceRow({
      ...(row as Record<string, unknown>),
      company_name: (client as { company_name: string } | null)?.company_name,
      customer_number: (client as { customer_number: string | null } | null)
        ?.customer_number,
    });
  });
}

/** Latest agency invoices — all statuses (draft, sent, paid, overdue). */
export async function getRecentInvoices(limit = 10): Promise<InvoiceRecord[]> {
  const invoices = await getAllInvoices();
  return invoices.slice(0, limit);
}

export async function getInvoiceItems(
  invoiceId: string,
): Promise<InvoiceItemRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoice_items")
    .select(
      `
      id,
      invoice_id,
      description,
      quantity,
      unit_price_cents,
      line_total_cents,
      sort_order,
      created_at
    `,
    )
    .eq("invoice_id", invoiceId)
    .order("sort_order", { ascending: true });

  if (error) {
    if (isPhase10InvoiceSchemaMissingError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    invoice_id: row.invoice_id as string,
    description: row.description as string,
    quantity: Number(row.quantity),
    unit_price_cents: row.unit_price_cents as number,
    line_total_cents: row.line_total_cents as number,
    sort_order: row.sort_order as number,
    created_at: row.created_at as string,
  }));
}

export async function getInvoiceWithDetails(
  invoiceId: string,
): Promise<InvoiceWithDetails | null> {
  await syncOverdueInvoices();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(
      `
      ${INVOICE_SELECT},
      client:clients!invoices_client_id_fkey(
        id,
        company_name,
        customer_number,
        contact_name,
        email,
        phone,
        website,
        currency
      )
    `,
    )
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) {
    if (isPhase10InvoiceSchemaMissingError(error.message)) return null;
    throw new Error(error.message);
  }

  if (!data) return null;

  const client = Array.isArray(data.client) ? data.client[0] : data.client;
  const items = await getInvoiceItems(invoiceId);
  const invoice = mapInvoiceRow({
    ...(data as Record<string, unknown>),
    company_name: (client as { company_name: string } | null)?.company_name,
    customer_number: (client as { customer_number: string | null } | null)
      ?.customer_number,
  });

  return {
    ...invoice,
    client: {
      id: (client as { id: string }).id,
      company_name: (client as { company_name: string }).company_name,
      customer_number:
        (client as { customer_number: string | null }).customer_number ?? null,
      contact_name: (client as { contact_name: string | null }).contact_name,
      email: (client as { email: string | null }).email,
      phone: (client as { phone: string | null }).phone,
      website: (client as { website: string | null }).website,
      currency: (client as { currency: string }).currency ?? "EUR",
    },
    items,
  };
}

export interface InvoiceStats {
  totalInvoicedCents: number;
  openInvoicesCents: number;
  paidInvoicesCents: number;
  overdueInvoicesCents: number;
  outstandingInvoiceAmountCents: number;
}

export async function getInvoiceStats(): Promise<InvoiceStats> {
  await syncOverdueInvoices();

  const invoices = await getAllInvoices();

  let totalInvoicedCents = 0;
  let openInvoicesCents = 0;
  let paidInvoicesCents = 0;
  let overdueInvoicesCents = 0;
  let outstandingInvoiceAmountCents = 0;

  for (const invoice of invoices) {
    const gross = invoice.total_amount_cents;
    if (invoice.status === "cancelled") continue;

    totalInvoicedCents += gross;

    if (invoice.status === "paid") {
      paidInvoicesCents += gross;
    } else if (invoice.status === "overdue") {
      overdueInvoicesCents += gross;
      outstandingInvoiceAmountCents += gross;
    } else if (invoice.status === "draft" || invoice.status === "sent") {
      openInvoicesCents += gross;
      outstandingInvoiceAmountCents += gross;
    }
  }

  return {
    totalInvoicedCents,
    openInvoicesCents,
    paidInvoicesCents,
    overdueInvoicesCents,
    outstandingInvoiceAmountCents,
  };
}

export { calculateInvoiceAmounts, DEFAULT_VAT_RATE };
