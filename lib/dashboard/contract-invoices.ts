import { resolveRetainerAmountCents } from "./billing-cycle";
import { isContractRevenueActive } from "./contract-status";
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from "./constants";
import { resolveInvoiceType } from "./invoice-type";
import { calculateInvoiceAmounts, type InvoiceAmounts } from "./invoice-math";
import type { ClientDetailRecord, InvoiceRecord } from "./types";

export interface ContractInvoiceFilter {
  clientId: string;
  contractId?: string | null;
}

type ContractClientFields = Pick<
  ClientDetailRecord,
  | "contract_start_date"
  | "contract_status"
  | "lead_estimated_value_cents"
  | "setup_fee_cents"
  | "monthly_retainer_cents"
  | "monthly_revenue_cents"
>;

/** Net setup fee for setup invoices — never falls back to retainer amounts. */
export function getSetupFeeCents(client: ContractClientFields): number | null {
  const setup = client.setup_fee_cents;
  if (setup != null && setup > 0) return setup;
  return null;
}

/** Monthly retainer from contract fields (monthly_revenue_cents preferred). */
export function getContractRetainerCents(client: ContractClientFields): number {
  return resolveRetainerAmountCents({
    monthly_retainer_cents: client.monthly_retainer_cents,
    monthly_revenue_cents: client.monthly_revenue_cents,
  });
}

/** @deprecated Use getSetupFeeCents for setup invoices. */
export function getContractSubtotalCents(client: ContractClientFields): number | null {
  const setup = getSetupFeeCents(client);
  if (setup != null) return setup;

  const retainer = getContractRetainerCents(client);
  if (retainer > 0) return retainer;

  const estimate = client.lead_estimated_value_cents;
  if (estimate != null && estimate > 0) return estimate;

  return null;
}

export function hasActiveContract(client: ContractClientFields): boolean {
  if (!isContractRevenueActive(client)) return false;
  return getSetupFeeCents(client) != null || getContractRetainerCents(client) > 0;
}

export function hasSetupFee(client: ContractClientFields): boolean {
  return getSetupFeeCents(client) != null;
}

export function findSetupInvoice(invoices: InvoiceRecord[]): InvoiceRecord | null {
  const setupInvoices = invoices.filter(
    (invoice) =>
      resolveInvoiceType(invoice) === "setup" && invoice.status !== "cancelled",
  );

  if (setupInvoices.length === 0) return null;

  return setupInvoices.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];
}

export function hasSetupInvoice(invoices: InvoiceRecord[]): boolean {
  return findSetupInvoice(invoices) != null;
}

export function canCreateSetupInvoice(
  client: ContractClientFields,
  invoices: InvoiceRecord[],
): boolean {
  return getSetupFeeCents(client) != null && !hasSetupInvoice(invoices);
}

export function getSetupInvoiceStatusLabel(invoice: InvoiceRecord): string {
  const status = invoice.status as InvoiceStatus;
  return INVOICE_STATUS_LABELS[status] ?? invoice.status;
}

export function hasRetainerContract(client: ContractClientFields): boolean {
  return isContractRevenueActive(client) && getContractRetainerCents(client) > 0;
}

export function getSetupInvoicePreview(
  client: ContractClientFields,
): InvoiceAmounts | null {
  const subtotalCents = getSetupFeeCents(client);
  if (subtotalCents == null) return null;
  return calculateInvoiceAmounts(subtotalCents);
}

export function getRetainerInvoicePreview(
  client: ContractClientFields,
): InvoiceAmounts | null {
  const subtotalCents = getContractRetainerCents(client);
  if (subtotalCents <= 0) return null;
  return calculateInvoiceAmounts(subtotalCents);
}

/** @deprecated Use getSetupInvoicePreview */
export function getContractInvoicePreview(
  client: ContractClientFields,
): InvoiceAmounts | null {
  return getSetupInvoicePreview(client) ?? getRetainerInvoicePreview(client);
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
