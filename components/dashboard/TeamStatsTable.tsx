"use client";

import { ROLE_LABELS, type UserRole } from "@/lib/auth/types";
import { formatCents } from "@/lib/dashboard/format";
import type { TeamMemberStats } from "@/lib/dashboard/types";

interface TeamStatsTableProps {
  stats: TeamMemberStats[];
}

export function TeamStatsTable({ stats }: TeamStatsTableProps) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
        Team-Statistiken
      </h2>
      <p className="mt-2 text-sm text-muted">
        Leads, Termine, Kunden und Pipeline-Wert pro Teammitglied.
      </p>

      <div className="dashboard-table mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-soft">
              <th className="px-3 py-3 font-medium">Mitglied</th>
              <th className="px-3 py-3 font-medium">Rolle</th>
              <th className="px-3 py-3 font-medium text-right">Leads</th>
              <th className="px-3 py-3 font-medium text-right">Termine</th>
              <th className="px-3 py-3 font-medium text-right">Kunden</th>
              <th className="px-3 py-3 font-medium text-right">Pipeline</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((member) => (
              <tr
                key={member.userId}
                className="border-b border-border/60 transition-colors hover:bg-white/[0.02]"
              >
                <td className="px-3 py-3">
                  <div className="font-medium text-foreground">{member.fullName}</div>
                  <div className="text-xs text-muted-soft">{member.email}</div>
                </td>
                <td className="px-3 py-3 text-muted">
                  {ROLE_LABELS[member.role as UserRole] ?? member.role}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-foreground">
                  {member.leadsCount}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-foreground">
                  {member.appointmentsCount}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-foreground">
                  {member.clientsCount}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-foreground">
                  {formatCents(member.pipelineValueCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
