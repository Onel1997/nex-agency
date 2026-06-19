import type { CommissionEntryStatus } from "./commission-constants";
import type { RetainerPeriodInvoiceRef } from "./retainer";
import { resolveInvoiceType } from "./invoice-type";
import type { InvoiceRecord, RetainerMonthPlanRow } from "./types";

export type RetainerPlanRowGroup = "billed" | "planned";

export interface RetainerPlanRowDisplay {
  group: RetainerPlanRowGroup;
  statusLabel: string;
  statusTone: "muted" | "amber" | "sky" | "violet" | "emerald";
  actionLabel: string;
  invoiceNumber: string | null;
  showCommissionAmounts: boolean;
  canApprove: boolean;
  canPay: boolean;
  commissionStatus: CommissionEntryStatus | null;
}

function isRetainerInvoice(
  invoice: RetainerPeriodInvoiceRef | null | undefined,
): invoice is RetainerPeriodInvoiceRef {
  if (!invoice) return false;
  return resolveInvoiceType(invoice as InvoiceRecord) === "retainer";
}

function findInvoiceForRow(
  row: RetainerMonthPlanRow,
  invoices: RetainerPeriodInvoiceRef[],
): RetainerPeriodInvoiceRef | null {
  return (
    invoices.find(
      (invoice) =>
        isRetainerInvoice(invoice) &&
        invoice.billing_period_year === row.billing_period_year &&
        invoice.billing_period_month === row.billing_period_month,
    ) ?? null
  );
}

export function resolveRetainerPlanRowDisplay(
  row: RetainerMonthPlanRow,
  invoices: RetainerPeriodInvoiceRef[],
): RetainerPlanRowDisplay {
  const invoice = findInvoiceForRow(row, invoices);
  const entry = row.entry;

  if (entry?.status === "pending") {
    return {
      group: "billed",
      statusLabel: "Offen",
      statusTone: "amber",
      actionLabel: "Freigeben",
      invoiceNumber: invoice?.invoice_number ?? null,
      showCommissionAmounts: true,
      canApprove: true,
      canPay: false,
      commissionStatus: "pending",
    };
  }

  if (entry?.status === "approved") {
    return {
      group: "billed",
      statusLabel: "Freigegeben",
      statusTone: "violet",
      actionLabel: "Auszahlen",
      invoiceNumber: invoice?.invoice_number ?? null,
      showCommissionAmounts: true,
      canApprove: false,
      canPay: true,
      commissionStatus: "approved",
    };
  }

  if (entry?.status === "paid") {
    return {
      group: "billed",
      statusLabel: "Bezahlt",
      statusTone: "emerald",
      actionLabel: "—",
      invoiceNumber: invoice?.invoice_number ?? null,
      showCommissionAmounts: true,
      canApprove: false,
      canPay: false,
      commissionStatus: "paid",
    };
  }

  if (invoice) {
    const invoicePaid = invoice.status === "paid";
    return {
      group: "billed",
      statusLabel: invoicePaid ? "Bezahlt" : "Rechnung erstellt",
      statusTone: invoicePaid ? "emerald" : "sky",
      actionLabel: invoicePaid
        ? "Provision noch nicht angelegt"
        : "Zahlung ausstehend",
      invoiceNumber: invoice.invoice_number ?? null,
      showCommissionAmounts: false,
      canApprove: false,
      canPay: false,
      commissionStatus: null,
    };
  }

  return {
    group: "planned",
    statusLabel: "Geplant",
    statusTone: "muted",
    actionLabel: "Rechnung noch nicht erstellt",
    invoiceNumber: null,
    showCommissionAmounts: false,
    canApprove: false,
    canPay: false,
    commissionStatus: null,
  };
}

export function partitionRetainerPlanRows(
  rows: RetainerMonthPlanRow[],
  invoices: RetainerPeriodInvoiceRef[],
): {
  billedRows: RetainerMonthPlanRow[];
  plannedRows: RetainerMonthPlanRow[];
} {
  const billedRows: RetainerMonthPlanRow[] = [];
  const plannedRows: RetainerMonthPlanRow[] = [];

  for (const row of rows) {
    const display = resolveRetainerPlanRowDisplay(row, invoices);
    if (display.group === "planned") {
      plannedRows.push(row);
    } else {
      billedRows.push(row);
    }
  }

  return { billedRows, plannedRows };
}

export function retainerPlanRowInvoiceIndex(
  invoices: RetainerPeriodInvoiceRef[],
): Map<string, RetainerPeriodInvoiceRef> {
  const index = new Map<string, RetainerPeriodInvoiceRef>();

  for (const invoice of invoices) {
    if (
      !isRetainerInvoice(invoice) ||
      invoice.billing_period_year == null ||
      invoice.billing_period_month == null
    ) {
      continue;
    }

    index.set(
      `${invoice.billing_period_year}-${invoice.billing_period_month}`,
      invoice,
    );
  }

  return index;
}
