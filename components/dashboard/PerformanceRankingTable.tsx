"use client";

import { ROLE_LABELS, type UserRole } from "@/lib/auth/types";
import { formatCents } from "@/lib/dashboard/format";
import { isSalesAgencyRole } from "@/lib/dashboard/sales-metrics";
import type { PerformanceMemberRow } from "@/lib/dashboard/types";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { TrendingUp } from "lucide-react";

interface PerformanceRankingTableProps {
  members: PerformanceMemberRow[];
  isTeamView: boolean;
}

function isProjectFreelancer(member: PerformanceMemberRow) {
  return member.role === "freelancer" && !isSalesAgencyRole(member.agencyRole);
}

export function PerformanceRankingTable({
  members,
  isTeamView,
}: PerformanceRankingTableProps) {
  if (members.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <EmptyState
          icon={TrendingUp}
          title="Keine Performance-Daten"
          description="Für den gewählten Zeitraum liegen noch keine Kennzahlen vor."
        />
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
        {isTeamView ? "Mitarbeiter-Ranking" : "Meine Performance"}
      </h2>
      <p className="mt-2 text-sm text-muted">
        Vertriebs- und Freelancer-Kennzahlen je Rolle — sortiert nach Umsatz bzw.
        Freelancer-Verdienst.
      </p>

      <div className="dashboard-table mt-6 overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-soft">
              <th className="px-3 py-3 font-medium">Mitarbeiter</th>
              <th className="px-3 py-3 font-medium text-right">Leads</th>
              <th className="px-3 py-3 font-medium text-right">Kunden</th>
              <th className="px-3 py-3 font-medium text-right">Umsatz</th>
              <th className="px-3 py-3 font-medium text-right">Provision</th>
              <th className="px-3 py-3 font-medium text-right">Conversion</th>
              <th className="px-3 py-3 font-medium text-right">Projekte</th>
              <th className="px-3 py-3 font-medium text-right">Verdienst</th>
              <th className="px-3 py-3 font-medium text-right">Ausgezahlt</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const projectFreelancer = isProjectFreelancer(member);

              return (
                <tr
                  key={member.userId}
                  className="border-b border-border/60 transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-3 py-3">
                    <div className="font-medium text-foreground">{member.fullName}</div>
                    <div className="text-xs text-muted-soft">
                      {ROLE_LABELS[member.role as UserRole] ?? member.role}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground">
                    {projectFreelancer ? "—" : member.leadsCount}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground">
                    {projectFreelancer ? "—" : member.clientsCount}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground">
                    {projectFreelancer ? "—" : formatCents(member.revenueCents)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground">
                    {projectFreelancer ? "—" : formatCents(member.commissionTotalCents)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground">
                    {projectFreelancer
                      ? "—"
                      : `${member.conversionRate.toLocaleString("de-DE")} %`}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground">
                    {projectFreelancer ? member.projectsCount : "—"}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground">
                    {projectFreelancer
                      ? formatCents(member.freelancerEarnedCents)
                      : "—"}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground">
                    {projectFreelancer
                      ? formatCents(member.freelancerPaidCents)
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
