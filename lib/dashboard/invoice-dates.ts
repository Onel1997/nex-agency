import { formatDate } from "./format";
import { INVOICE_PAYMENT_TERM_DAYS } from "./invoice-company";

export function computeInvoiceDueDate(invoiceDate: Date = new Date()): string {
  const due = new Date(invoiceDate);
  due.setDate(due.getDate() + INVOICE_PAYMENT_TERM_DAYS);
  return due.toISOString().slice(0, 10);
}

export function resolveInvoiceDueDate(
  dueDate: string | null | undefined,
  createdAt: string,
): string {
  if (dueDate) return dueDate;
  return computeInvoiceDueDate(new Date(createdAt));
}

export function formatInvoiceDueDate(
  dueDate: string | null | undefined,
  createdAt: string,
): string {
  const resolved = resolveInvoiceDueDate(dueDate, createdAt);
  return formatDate(`${resolved}T12:00:00`);
}
