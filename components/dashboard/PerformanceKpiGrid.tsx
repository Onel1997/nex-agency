"use client";

import { KpiCard } from "@/components/dashboard/KpiCard";
import { formatCents } from "@/lib/dashboard/format";
import type {
  PerformanceFreelancerKpis,
  PerformanceKpis,
} from "@/lib/dashboard/types";
import {
  Banknote,
  Briefcase,
  CalendarDays,
  FolderKanban,
  Percent,
  Target,
  Trophy,
  TrendingUp,
  Wallet,
} from "lucide-react";

interface PerformanceKpiGridProps {
  kpis: PerformanceKpis;
  freelancerKpis?: PerformanceFreelancerKpis | null;
  viewerIsFreelancer?: boolean;
}

export function PerformanceKpiGrid({
  kpis,
  freelancerKpis,
  viewerIsFreelancer = false,
}: PerformanceKpiGridProps) {
  if (viewerIsFreelancer && freelancerKpis) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Zugewiesene Projekte"
          value={freelancerKpis.projectsCount}
          icon={FolderKanban}
        />
        <KpiCard
          label="Projektvolumen"
          value={formatCents(freelancerKpis.projectVolumeCents)}
          icon={Briefcase}
        />
        <KpiCard
          label="Verdient"
          value={formatCents(freelancerKpis.earnedCents)}
          icon={TrendingUp}
        />
        <KpiCard
          label="Ausgezahlt"
          value={formatCents(freelancerKpis.paidCents)}
          icon={Banknote}
        />
        <KpiCard
          label="Offen"
          value={formatCents(freelancerKpis.outstandingCents)}
          icon={Wallet}
        />
      </div>
    );
  }

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
