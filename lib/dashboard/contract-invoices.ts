import { calculateInvoiceAmounts, type InvoiceAmounts } from "./invoice-math";
import type { ClientDetailRecord, InvoiceRecord } from "./types";

export interface ContractInvoiceFilter {
  clientId: string;
  contractId?: string | null;
}

type ContractClientFields = Pick<
  ClientDetailRecord,
  | "contract_start_date"
  | "lead_estimated_value_cents"
  | "setup_fee_cents"
  | "monthly_retainer_cents"
>;

export function getContractSubtotalCents(client: ContractClientFields): number | null {
  const subtotal =
    client.setup_fee_cents ??
    client.monthly_retainer_cents ??
    client.lead_estimated_value_cents;

  if (subtotal == null || subtotal <= 0) return null;
  return subtotal;
}

export function hasActiveContract(client: ContractClientFields): boolean {
  return Boolean(client.contract_start_date) && getContractSubtotalCents(client) != null;
}

export function getContractInvoicePreview(
  client: ContractClientFields,
): InvoiceAmounts | null {
  const subtotalCents = getContractSubtotalCents(client);
  if (subtotalCents == null) return null;
  return calculateInvoiceAmounts(subtotalCents);
}

export function filterInvoicesForClient(
  invoices: InvoiceRecord[],
  clientId: string,
): InvoiceRecord[] {
  return invoices.filter((invoice) => invoice.client_id === clientId);
}

export function filterContractInvoicesForClient(
  invoices: InvoiceRecord[],
  { clientId, contractId }: ContractInvoiceFilter,
): InvoiceRecord[] {
  return invoices.filter((invoice) => {
    if (invoice.client_id !== clientId) return false;
    if (contractId) return invoice.contract_id === contractId;
    return true;
  });
}
