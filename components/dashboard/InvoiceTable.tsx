"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Download,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";
import { InvoiceStatusBadge } from "@/components/dashboard/InvoiceStatusBadge";
import { formatCents, formatDate } from "@/lib/dashboard/format";
import { INVOICE_TYPE_LABELS } from "@/lib/dashboard/constants";
import { formatInvoiceDueDate } from "@/lib/dashboard/invoice-dates";
import { resolveInvoiceType } from "@/lib/dashboard/invoice-type";
import type { InvoiceRecord } from "@/lib/dashboard/types";

interface InvoiceTableProps {
  invoices: InvoiceRecord[];
  variant?: "compact" | "full" | "agency";
  companyName?: string;
  showActions?: boolean;
  isAdmin?: boolean;
  pending?: boolean;
  onDownload?: (invoiceId: string) => void;
  onMarkSent?: (invoiceId: string) => void;
  onMarkPaid?: (invoiceId: string) => void;
  onEdit?: (invoice: InvoiceRecord) => void;
  onDelete?: (invoiceId: string) => void;
}

export function InvoiceTable({
  invoices,
  variant = "full",
  companyName,
  showActions = false,
  isAdmin = false,
  pending = false,
  onDownload,
  onMarkSent,
  onMarkPaid,
  onEdit,
  onDelete,
}: InvoiceTableProps) {
  if (invoices.length === 0) {
    const emptyMessage =
      variant === "agency"
        ? "Noch keine Rechnungen vorhanden. Umsatz aus Verträgen wird unabhängig davon erfasst — Rechnungen unter Kunde → Rechnungen erstellen."
        : variant === "compact"
          ? "Noch keine Vertragsrechnungen vorhanden."
          : "Noch keine Rechnungen vorhanden.";

    return <p className="p-6 text-sm text-muted">{emptyMessage}</p>;
  }

  const showClient = variant === "agency";
  const showInvoiceType = variant === "compact";
  const showNetVat = variant === "full";
  const showActionsColumn =
    (showActions && variant === "full") ||
    ((variant === "agency" || variant === "compact") && Boolean(onDownload));

  return (
    <div className="overflow-x-auto">
      <table
        className={`dashboard-table w-full text-left text-sm ${
          variant === "compact" ? "min-w-[760px]" : "min-w-[980px]"
        }`}
      >
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-soft">
              Rechnungsnummer
            </th>
            {showClient && (
              <th className="px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-soft">
                Kunde
              </th>
            )}
            {showNetVat && (
              <>
                <th className="hidden px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-soft md:table-cell">
                  Netto
                </th>
                <th className="hidden px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-soft lg:table-cell">
                  MwSt.
                </th>
              </>
            )}
            <th className="px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-soft">
              Betrag
            </th>
            {showInvoiceType && (
              <th className="px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-soft">
                Typ
              </th>
            )}
            <th className="px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-soft">
              Status
            </th>
            <th className="hidden px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-soft md:table-cell">
              Rechnungsdatum
            </th>
            <th className="hidden px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-soft lg:table-cell">
              Fällig bis
            </th>
            {showActionsColumn && (
              <th className="px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-soft">
                Aktionen
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td className="px-4 py-3">
                <div className="font-medium">{invoice.invoice_number}</div>
                {variant === "full" && companyName && (
                  <div className="text-xs text-muted-soft md:hidden">
                    {formatCents(invoice.total_amount_cents)} · {companyName}
                  </div>
                )}
              </td>
              {showClient && (
                <td className="px-4 py-3">
                  {invoice.company_name ? (
                    <Link
                      href={`/dashboard/clients/${invoice.client_id}?tab=invoices`}
                      className="dashboard-link text-sm"
                    >
                      {invoice.company_name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
              )}
              {showNetVat && (
                <>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {formatCents(invoice.subtotal_cents)}
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    {formatCents(invoice.tax_amount_cents)}
                  </td>
                </>
              )}
              <td className="px-4 py-3 font-medium">
                {formatCents(invoice.total_amount_cents)}
              </td>
              {showInvoiceType && (
                <td className="px-4 py-3 text-muted">
                  {(() => {
                    const type = resolveInvoiceType(invoice);
                    return type ? INVOICE_TYPE_LABELS[type] : "—";
                  })()}
                </td>
              )}
              <td className="px-4 py-3">
                <InvoiceStatusBadge status={invoice.status} />
              </td>
              <td className="hidden px-4 py-3 text-muted md:table-cell">
                {formatDate(invoice.created_at)}
              </td>
              <td className="hidden px-4 py-3 text-muted lg:table-cell">
                {formatInvoiceDueDate(invoice.due_date, invoice.created_at)}
              </td>
              {showActionsColumn && (
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {onDownload && (
                      <button
                        type="button"
                        onClick={() => onDownload(invoice.id)}
                        className="dashboard-icon-btn rounded-lg p-2"
                        aria-label="PDF herunterladen"
                        title="PDF herunterladen"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                    {variant === "full" && onMarkSent && invoice.status === "draft" && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onMarkSent(invoice.id)}
                        className="dashboard-icon-btn rounded-lg p-2"
                        aria-label="Als gesendet markieren"
                        title="Als gesendet markieren"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    )}
                    {variant === "full" &&
                      onMarkPaid &&
                      invoice.status !== "paid" &&
                      invoice.status !== "cancelled" && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onMarkPaid(invoice.id)}
                          className="dashboard-icon-btn rounded-lg p-2"
                          aria-label="Als bezahlt markieren"
                          title="Als bezahlt markieren"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      )}
                    {variant === "full" && onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(invoice)}
                        className="dashboard-icon-btn rounded-lg p-2"
                        aria-label="Bearbeiten"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {variant === "full" && isAdmin && onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(invoice.id)}
                        className="dashboard-icon-btn rounded-lg p-2 text-red-300 hover:text-red-200"
                        aria-label="Löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
