"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import {
  deleteFreelancerInvoice,
  updateFreelancerInvoiceStatus,
} from "@/app/dashboard/finance/freelancers/actions";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { FreelancerInvoiceModal } from "@/components/dashboard/FreelancerInvoiceModal";
import { FreelancerInvoiceStatusBadge } from "@/components/dashboard/FreelancerInvoiceStatusBadge";
import { FreelancerModal } from "@/components/dashboard/FreelancerModal";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { formatCents, formatDate } from "@/lib/dashboard/format";
import type { FreelancerInvoiceRecord, FreelancerRecord } from "@/lib/dashboard/types";
import { Banknote, Clock3, Euro, Wallet } from "lucide-react";

interface FreelancerDetailPageClientProps {
  freelancer: FreelancerRecord;
  invoices: FreelancerInvoiceRecord[];
}

export function FreelancerDetailPageClient({
  freelancer,
  invoices,
}: FreelancerDetailPageClientProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleStatus = (invoiceId: string, status: "submitted" | "paid") => {
    setError(null);
    startTransition(async () => {
      try {
        await updateFreelancerInvoiceStatus(invoiceId, status);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Status konnte nicht geändert werden");
      }
    });
  };

  const handleDelete = (invoiceId: string) => {
    if (!confirm("Entwurf wirklich löschen?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteFreelancerInvoice(invoiceId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Löschen fehlgeschlagen");
      }
    });
  };

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard/finance/freelancers"
        className="dashboard-link inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Freelancern
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <DashboardHeader
          title={freelancer.name}
          description={
            freelancer.company_name
              ? `${freelancer.company_name} — Freelancer-Rechnungen an NexAgency`
              : "Freelancer-Rechnungen an NexAgency"
          }
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setEditOpen(true)} className="dashboard-btn-secondary">
            Bearbeiten
          </button>
          <button type="button" onClick={() => setInvoiceOpen(true)} className="dashboard-btn-primary">
            Rechnung erfassen
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Gesamt verdient" value={formatCents(freelancer.total_earned_cents)} icon={Euro} />
        <KpiCard label="Ausgezahlt" value={formatCents(freelancer.total_paid_out_cents)} icon={Banknote} />
        <KpiCard label="Noch offen" value={formatCents(freelancer.outstanding_cents)} icon={Wallet} />
        <KpiCard
          label="Letzte Auszahlung"
          value={
            freelancer.last_payout_at
              ? formatDate(freelancer.last_payout_at)
              : "—"
          }
          icon={Clock3}
        />
      </div>

      <div className="glass-card rounded-2xl p-5 text-sm text-muted">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="Ansprechpartner" value={freelancer.contact_person} />
          <Info label="E-Mail" value={freelancer.email} />
          <Info label="Telefon" value={freelancer.phone} />
          <Info
            label="Adresse"
            value={
              [freelancer.street, freelancer.postal_code, freelancer.city, freelancer.country]
                .filter(Boolean)
                .join(", ") || null
            }
          />
          <Info label="IBAN" value={freelancer.iban} />
          <Info label="Provisionssatz" value={`${freelancer.default_commission_rate}%`} />
        </div>
      </div>

      <DataTable
        columns={[
          {
            key: "number",
            header: "Rechnung",
            render: (invoice) => (
              <div>
                <div className="font-medium text-foreground">{invoice.invoice_number}</div>
                <div className="text-xs text-muted-soft">{formatDate(invoice.created_at)}</div>
              </div>
            ),
          },
          {
            key: "description",
            header: "Leistung",
            hideOnMobile: true,
            render: (invoice) => invoice.description,
          },
          {
            key: "net",
            header: "Netto",
            className: "text-right",
            hideOnMobile: true,
            render: (invoice) => formatCents(invoice.subtotal_cents),
          },
          {
            key: "total",
            header: "Gesamt",
            className: "text-right",
            render: (invoice) => formatCents(invoice.total_amount_cents),
          },
          {
            key: "status",
            header: "Status",
            render: (invoice) => <FreelancerInvoiceStatusBadge status={invoice.status} />,
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            render: (invoice) => (
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      `/api/freelancer-invoices/${invoice.id}/pdf`,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                  className="dashboard-link text-xs"
                >
                  PDF
                </button>
                {invoice.status === "draft" && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleStatus(invoice.id, "submitted")}
                    className="dashboard-link text-xs"
                  >
                    Eingereicht
                  </button>
                )}
                {invoice.status === "submitted" && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleStatus(invoice.id, "paid")}
                    className="dashboard-link text-xs"
                  >
                    Bezahlt
                  </button>
                )}
                {invoice.status === "draft" && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(invoice.id)}
                    className="text-xs text-red-300 hover:text-red-200"
                  >
                    Löschen
                  </button>
                )}
              </div>
            ),
          },
        ]}
        data={invoices}
        rowKey={(invoice) => invoice.id}
        emptyState={
          <EmptyState
            icon={FileText}
            title="Keine Rechnungen"
            description="Erfassen Sie die erste Freelancer-Rechnung an NexAgency."
          />
        }
      />

      <FreelancerModal
        freelancer={freelancer}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
      <FreelancerInvoiceModal
        freelancerId={freelancer.id}
        freelancerName={freelancer.name}
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-soft">{label}</div>
      <div className="mt-1 text-foreground">{value ?? "—"}</div>
    </div>
  );
}
