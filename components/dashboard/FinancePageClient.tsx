"use client";

import { useEffect, useState } from "react";
import { CommissionPayoutModal } from "@/components/dashboard/CommissionPayoutModal";
import { CommissionStatusBadge } from "@/components/dashboard/CommissionStatusBadge";
import { ClientRevenueModal } from "@/components/dashboard/ClientRevenueModal";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { InvoiceTable } from "@/components/dashboard/InvoiceTable";
import { formatCents, formatDate } from "@/lib/dashboard/format";
import type { ClientRevenueRecord, FinanceStats, InvoiceRecord } from "@/lib/dashboard/types";
import {
  AlertCircle,
  Banknote,
  CircleDollarSign,
  Clock3,
  Euro,
  FileCheck2,
  Receipt,
  Wallet,
} from "lucide-react";
import Link from "next/link";

interface FinancePageClientProps {
  stats: FinanceStats;
  clients: ClientRevenueRecord[];
  invoices: InvoiceRecord[];
}

export function FinancePageClient({ stats, clients, invoices }: FinancePageClientProps) {
  const [editingClient, setEditingClient] = useState<ClientRevenueRecord | null>(
    null,
  );
  const [payoutClient, setPayoutClient] = useState<ClientRevenueRecord | null>(
    null,
  );

  useEffect(() => {
    if (!editingClient) return;
    const updated = clients.find((client) => client.id === editingClient.id);
    if (updated) setEditingClient(updated);
  }, [clients, editingClient?.id]);

  useEffect(() => {
    if (!payoutClient) return;
    const updated = clients.find((client) => client.id === payoutClient.id);
    if (updated) setPayoutClient(updated);
  }, [clients, payoutClient?.id]);

  const handlePayoutRequest = (client: ClientRevenueRecord) => {
    setPayoutClient(client);
  };

  const handlePayoutClose = () => {
    setPayoutClient(null);
  };

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Finanzen"
        description="Verträge, Retainer, Umsatz und Provisionsübersicht — nur für Administratoren."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <KpiCard
          label="Gesamtumsatz"
          value={formatCents(stats.totalRevenueCents)}
          icon={Euro}
          trend="Setup + bezahlte Retainer"
        />
        <KpiCard
          label="MRR"
          value={formatCents(stats.monthlyRecurringRevenueCents)}
          icon={CircleDollarSign}
          trend="Monatliche Retainer-Summe"
        />
        <KpiCard
          label="Offene Provisionen"
          value={formatCents(stats.outstandingCommissionsCents)}
          icon={Wallet}
          trend="Noch auszuzahlen"
        />
        <KpiCard
          label="Bezahlte Provisionen"
          value={formatCents(stats.paidCommissionsCents)}
          icon={Banknote}
          trend="Bereits ausgezahlt"
        />
        <KpiCard
          label="Offene Retainer-Zahlungen"
          value={formatCents(stats.outstandingRetainerPaymentsCents)}
          icon={Clock3}
          trend="Unbezahlte Monatsbeträge"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <KpiCard
          label="Gesamt fakturiert"
          value={formatCents(stats.totalInvoicedCents)}
          icon={Receipt}
          trend="Brutto aller Rechnungen"
        />
        <KpiCard
          label="Offene Rechnungen"
          value={formatCents(stats.openInvoicesCents)}
          icon={FileCheck2}
          trend="Entwurf & gesendet"
        />
        <KpiCard
          label="Überfällige Rechnungen"
          value={formatCents(stats.overdueInvoicesCents)}
          icon={AlertCircle}
          trend="Fälligkeitsdatum überschritten"
        />
        <KpiCard
          label="Bezahlt"
          value={formatCents(stats.paidInvoicesCents)}
          icon={Banknote}
          trend="Status: bezahlt"
        />
        <KpiCard
          label="Offener Betrag"
          value={formatCents(stats.outstandingInvoiceAmountCents)}
          icon={Wallet}
          trend="Noch nicht bezahlt"
        />
      </div>

      <div>
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
          Alle Rechnungen
        </h2>
        <p className="mt-1 text-sm text-muted">
          Zentraler Überblick über alle Agenturrechnungen — unabhängig vom Kunden.
        </p>
        <div className="glass-card mt-4 overflow-hidden rounded-2xl">
          <InvoiceTable
            invoices={invoices}
            variant="agency"
            onDownload={(invoiceId) => {
              window.open(`/api/invoices/${invoiceId}/pdf`, "_blank", "noopener,noreferrer");
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
            Kundenumsätze
          </h2>
          <p className="mt-1 text-sm text-muted">
            Vertragsdaten, Retainer und Provisionsstatus pro Kunde verwalten.
          </p>
        </div>
        <Link href="/dashboard/performance" className="dashboard-link text-sm">
          Team-Performance →
        </Link>
      </div>

      <DataTable
        columns={[
          {
            key: "company",
            header: "Kunde",
            render: (client) => (
              <div>
                <div className="font-medium text-foreground">{client.company_name}</div>
                <div className="text-xs text-muted-soft">
                  {client.responsible_member_name ?? "—"}
                </div>
              </div>
            ),
          },
          {
            key: "contract",
            header: "Vertragsbeginn",
            hideOnMobile: true,
            render: (client) =>
              client.contract_start_date
                ? formatDate(`${client.contract_start_date}T12:00:00`)
                : "—",
          },
          {
            key: "monthly",
            header: "Monatlich",
            className: "text-right",
            hideOnMobile: true,
            render: (client) => formatCents(client.monthly_revenue_cents),
          },
          {
            key: "setup",
            header: "Setup",
            className: "text-right",
            hideOnMobile: true,
            render: (client) => formatCents(client.setup_fee_cents),
          },
          {
            key: "retainer",
            header: "Retainer",
            className: "text-right",
            hideOnMobile: true,
            render: (client) =>
              (client.monthly_revenue_cents ?? 0) > 0 ? (
                <div>
                  <div>{formatCents(client.retainer_revenue_cents)}</div>
                  <div className="text-xs text-muted-soft">
                    {client.months_paid} bezahlt / {client.months_open} offen
                  </div>
                </div>
              ) : (
                <span className="text-muted-soft">Kein Retainer</span>
              ),
          },
          {
            key: "total",
            header: "Gesamt",
            className: "text-right",
            render: (client) => formatCents(client.total_revenue_cents),
          },
          {
            key: "commission",
            header: "Provision",
            className: "text-right",
            hideOnMobile: true,
            render: (client) => (
              <div>
                <div>{formatCents(client.commission_total_cents)}</div>
                <div className="text-xs text-muted-soft">
                  {formatCents(client.commission_paid_cents)} ausgezahlt
                </div>
                <div className="text-xs text-muted-soft">
                  {formatCents(client.commission_outstanding_cents)} offen
                </div>
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (client) => (
              <CommissionStatusBadge status={client.commission_status} />
            ),
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            render: (client) => (
              <button
                type="button"
                onClick={() => setEditingClient(client)}
                className="dashboard-link text-xs"
              >
                Bearbeiten
              </button>
            ),
          },
        ]}
        data={clients}
        rowKey={(client) => client.id}
        emptyState={
          <EmptyState
            icon={Receipt}
            title="Keine Kundenumsätze"
            description="Sobald Kunden mit Umsatzdaten vorhanden sind, erscheinen sie hier."
          />
        }
      />

      <ClientRevenueModal
        client={editingClient}
        open={editingClient !== null}
        payoutOpen={payoutClient !== null}
        onClose={() => {
          if (payoutClient) return;
          setEditingClient(null);
        }}
        onRequestPayout={handlePayoutRequest}
      />

      <CommissionPayoutModal
        client={payoutClient}
        open={payoutClient !== null}
        onClose={handlePayoutClose}
      />
    </div>
  );
}
