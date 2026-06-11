import type { InvoiceType } from "./constants";
import type { InvoiceRecord } from "./types";

export function resolveInvoiceType(invoice: InvoiceRecord): InvoiceType | null {
  if (invoice.invoice_type) return invoice.invoice_type;
  if (invoice.billing_period_year && invoice.billing_period_month) return "retainer";
  if (invoice.contract_id) return "setup";
  return "manual";
}
