"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { InvoiceTable } from "@/components/dashboard/InvoiceTable";
import { ProfitBreakdownCard } from "@/components/dashboard/ProfitBreakdownCard";
import { formatCents } from "@/lib/dashboard/format";
import type { FinanceStats, InvoiceRecord, ProfitBreakdown } from "@/lib/dashboard/types";
import { Briefcase, Euro, FileWarning, TrendingUp, UserCheck, Wallet } from "lucide-react";

interface FinancePageClientProps {
  stats: FinanceStats;
  invoices: InvoiceRecord[];
  profitBreakdowns: ProfitBreakdown[];
}

export function FinancePageClient({
  stats,
  invoices,
  profitBreakdowns,
}: FinancePageClientProps) {
  return (
    <div className="space-y-12">
      <DashboardHeader
        title="Finanzen"
        description="Reporting-Dashboard — liest Vertrags- und Rechnungsdaten aus den Kundenakten. Pflege erfolgt unter Kunde → Verträge / Rechnungen."
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          size="hero"
          label="Gesamtumsatz"
          value={formatCents(stats.totalRevenueCents)}
          icon={Euro}
          trend="Setup-Umsatz + bezahlte Retainer"
        />
        <KpiCard
          size="hero"
          label="Offene Forderungen"
          value={formatCents(stats.outstandingInvoiceAmountCents)}
          icon={FileWarning}
          trend="Summe aller unbezahlten Rechnungen"
        />
        <KpiCard
          size="hero"
          label="Offene Provisionen"
          value={formatCents(stats.outstandingCommissionsCents)}
          icon={Wallet}
          trend="Noch nicht ausgezahlte Sales-Provisionen"
        />
        <KpiCard
          size="hero"
          label="Agenturgewinn"
          value={formatCents(stats.agencyProfitCents)}
          icon={TrendingUp}
          trend="Umsatz − Freelancer − Provisionen − Agenturkosten"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Offene Freelancer-Auszahlungen"
          value={formatCents(stats.outstandingClientFreelancerPayoutsCents)}
          icon={Briefcase}
          trend="Projekt-Freelancer noch nicht ausgezahlt"
        />
        <KpiCard
          label="Bereits ausgezahlte Freelancer"
          value={formatCents(stats.paidClientFreelancerPayoutsCents)}
          icon={UserCheck}
          trend="Summe aller Projekt-Freelancer-Auszahlungen"
        />
        <KpiCard
          label="Agenturgewinn gesamt"
          value={formatCents(stats.agencyProfitAfterFreelancerPayoutsCents)}
          icon={TrendingUp}
          trend="Umsatz − Freelancer − Provisionen − Agenturkosten"
        />
        <KpiCard
          label="Agenturanteil Freelancer-Projekte"
          value={formatCents(stats.freelancerProjectAgencyShareCents)}
          icon={TrendingUp}
          trend="Setup − Freelancer-Auszahlung (zugewiesene Projekte)"
        />
        <KpiCard
          label="Noch offene Freelancer-Kosten"
          value={formatCents(stats.outstandingClientFreelancerPayoutsCents)}
          icon={Briefcase}
          trend="Fällig nach bezahlter Setup-Rechnung"
        />
      </div>

      <section className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Gewinnberechnung
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Kundenumsatz minus Freelancerkosten, Provisionen und Agenturkosten —
            nach Zeitraum.
          </p>
        </div>
        <ProfitBreakdownCard breakdowns={profitBreakdowns} />
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Letzte Rechnungen
          </h2>
          <p className="mt-1 text-sm text-muted">
            Die 10 zuletzt erstellten Rechnungen (alle Status). Neue Rechnungen
            unter Kunde → Rechnungen.
          </p>
        </div>
        <div className="glass-card overflow-hidden rounded-2xl">
          <InvoiceTable
            invoices={invoices}
            variant="agency"
            onDownload={(invoiceId) => {
              window.open(`/api/invoices/${invoiceId}/pdf`, "_blank", "noopener,noreferrer");
            }}
          />
        </div>
      </section>
    </div>
  );
}
