"use client";

import { ROLE_LABELS, type UserRole } from "@/lib/auth/types";
import { formatCents } from "@/lib/dashboard/format";
import type { PerformanceMemberRow } from "@/lib/dashboard/types";
import {
  CalendarDays,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

interface PerformanceMemberCardsProps {
  members: PerformanceMemberRow[];
}

export function PerformanceMemberCards({ members }: PerformanceMemberCardsProps) {
  if (members.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
        Performance Details
      </h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {members.map((member) => (
          <article
            key={member.userId}
            className="glass-card rounded-2xl p-5 transition-transform hover:scale-[1.01]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {member.fullName}
                </h3>
                <p className="text-sm text-muted">
                  {ROLE_LABELS[member.role as UserRole] ?? member.role}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/10 ring-1 ring-violet-500/20">
                <TrendingUp className="h-4 w-4 text-violet-300" />
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <Metric label="Leads" value={String(member.leadsCount)} icon={Target} />
              <Metric label="Kunden" value={String(member.clientsCount)} icon={Users} />
              <Metric
                label="Umsatz"
                value={formatCents(member.revenueCents)}
                icon={TrendingUp}
              />
              <Metric
                label="Offene Provision"
                value={formatCents(member.commissionOutstandingCents)}
                icon={Wallet}
              />
              <Metric
                label="Ausgezahlte Provision"
                value={formatCents(member.commissionPaidCents)}
                icon={Wallet}
              />
              <Metric
                label="Termine"
                value={String(member.appointmentsCount)}
                icon={CalendarDays}
              />
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Target;
}) {
  return (
    <div className="rounded-xl bg-surface-elevated/60 px-3 py-2.5 ring-1 ring-border/60">
      <dt className="flex items-center gap-1.5 text-xs text-muted-soft">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className="mt-1 font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
