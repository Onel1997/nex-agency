"use client";

import Link from "next/link";
import { ExternalLink, FileText } from "lucide-react";
import { Modal } from "@/components/dashboard/Modal";
import { PayoutDerivedStatusBadge } from "@/components/dashboard/PayoutDerivedStatusBadge";
import { formatCents, formatDateTime } from "@/lib/dashboard/format";
import type { PayoutCenterLineItem } from "@/lib/dashboard/types";

interface PayoutCenterDetailPanelProps {
  line: PayoutCenterLineItem | null;
  open: boolean;
  onClose: () => void;
  pending: boolean;
  onApprove: (entryId: string) => void;
  onPay: (entryId: string, role: PayoutCenterLineItem["role"]) => void;
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-soft">
        {label}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

export function PayoutCenterDetailPanel({
  line,
  open,
  onClose,
  pending,
  onApprove,
  onPay,
}: PayoutCenterDetailPanelProps) {
  if (!line) return null;

  const invoicePdfHref = line.invoiceId
    ? `/api/commission-freelancer-invoices/${line.invoiceId}/pdf`
    : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Auszahlungsdetails"
      size="lg"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <PayoutDerivedStatusBadge status={line.derivedStatus} />
          <span className="text-lg font-semibold text-foreground">
            {formatCents(line.amountCents)}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DetailRow label="Freelancer">
            <Link
              href={`/dashboard/team/${line.profileId}`}
              className="dashboard-link inline-flex items-center gap-1"
            >
              {line.profileName}
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </DetailRow>
          <DetailRow label="Rolle">{line.roleLabel}</DetailRow>
          <DetailRow label="Kunde">
            <Link
              href={`/dashboard/clients/${line.clientId}`}
              className="dashboard-link inline-flex items-center gap-1"
            >
              {line.clientName}
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </DetailRow>
          <DetailRow label="Typ">{line.entryTypeLabel}</DetailRow>
          <DetailRow label="Monat">{line.billingPeriodLabel}</DetailRow>
          <DetailRow label="Provision">
            {line.commissionRate.toFixed(2).replace(".", ",")} % ·{" "}
            {formatCents(line.amountCents)}
          </DetailRow>
        </div>

        <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-soft">
            Nachverfolgung
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailRow label="Commission Entry">
              <Link
                href="/dashboard/finance/commissions"
                className="dashboard-link inline-flex items-center gap-1 font-mono text-xs"
              >
                {line.entryId.slice(0, 8)}…
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </DetailRow>
            <DetailRow label="Kundenrechnung">
              {line.triggeredInvoiceId ? (
                <Link
                  href={`/api/invoices/${line.triggeredInvoiceId}/pdf`}
                  target="_blank"
                  className="dashboard-link inline-flex items-center gap-1"
                >
                  {line.triggeredInvoiceNumber ?? "Rechnung"}
                  <FileText className="h-3.5 w-3.5" />
                </Link>
              ) : (
                "—"
              )}
            </DetailRow>
            <DetailRow label="Payout">
              {line.payoutId ? (
                <span className="font-mono text-xs">{line.payoutId.slice(0, 8)}…</span>
              ) : (
                "—"
              )}
            </DetailRow>
            <DetailRow label="Freigegeben am">
              {line.approvedAt ? formatDateTime(line.approvedAt) : "—"}
            </DetailRow>
            <DetailRow label="Ausgezahlt am">
              {line.payoutPaidAt ? formatDateTime(line.payoutPaidAt) : "—"}
            </DetailRow>
            <DetailRow label="Freelancer-Rechnung">
              {line.invoiceNumber ? (
                <span className="font-medium">{line.invoiceNumber}</span>
              ) : (
                "—"
              )}
            </DetailRow>
          </div>
        </div>

        {invoicePdfHref && (
          <a
            href={invoicePdfHref}
            target="_blank"
            rel="noopener noreferrer"
            className="dashboard-btn-secondary inline-flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            PDF herunterladen
          </a>
        )}

        <div className="flex flex-wrap gap-3 border-t border-border pt-4">
          {line.derivedStatus === "offen" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => onApprove(line.entryId)}
              className="dashboard-btn-secondary"
            >
              Freigeben
            </button>
          )}
          {line.derivedStatus === "freigegeben" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => onPay(line.entryId, line.role)}
              className="dashboard-btn-primary"
            >
              Auszahlen
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
