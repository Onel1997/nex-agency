"use client";

import { KpiCard } from "@/components/dashboard/KpiCard";
import { formatCents } from "@/lib/dashboard/format";
import type { PerformanceKpis } from "@/lib/dashboard/types";
import {
  Banknote,
  CalendarDays,
  Percent,
  Target,
  Trophy,
  TrendingUp,
  Wallet,
} from "lucide-react";

interface PerformanceKpiGridProps {
  kpis: PerformanceKpis;
}

export function PerformanceKpiGrid({ kpis }: PerformanceKpiGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
      <KpiCard label="Gesamt-Leads" value={kpis.totalLeads} icon={Target} />
      <KpiCard label="Gewonnene Leads" value={kpis.wonLeads} icon={Trophy} />
      <KpiCard
        label="Conversion Rate"
        value={`${kpis.conversionRate.toLocaleString("de-DE")} %`}
        icon={Percent}
      />
      <KpiCard
        label="Gesamtumsatz"
        value={formatCents(kpis.totalRevenueCents)}
        icon={TrendingUp}
      />
      <KpiCard
        label="Offene Provisionen"
        value={formatCents(kpis.outstandingCommissionsCents)}
        icon={Wallet}
      />
      <KpiCard
        label="Ausgezahlte Provisionen"
        value={formatCents(kpis.paidCommissionsCents)}
        icon={Banknote}
      />
      <KpiCard
        label="Termine"
        value={kpis.appointmentsCount}
        icon={CalendarDays}
      />
    </div>
  );
}
