import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Receipt,
  Target,
  Users,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import type { WorkflowDashboardStats } from "@/lib/dashboard/workflow-stats";
import type { WorkflowUrgency } from "@/lib/dashboard/workflow-status";

interface WorkflowKpiGridProps {
  stats: WorkflowDashboardStats;
  managementView: boolean;
}

const URGENCY_TREND: Record<WorkflowUrgency, string | undefined> = {
  urgent: "Dringend",
  action: "Aktion nötig",
  waiting: "Wartet",
  completed: "Abgeschlossen",
};

export function WorkflowKpiGrid({ stats, managementView }: WorkflowKpiGridProps) {
  if (managementView) {
    return (
      <div>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-soft">
          Workflow-Status
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="Offene Leads"
            value={stats.openLeads}
            icon={Target}
            href="/dashboard/leads"
            trend={URGENCY_TREND.waiting}
            urgency="waiting"
          />
          <KpiCard
            label="Gewonnen ohne Vertrag"
            value={stats.wonLeadsWithoutContract}
            icon={AlertTriangle}
            href="/dashboard/leads"
            trend={URGENCY_TREND.action}
            urgency="action"
          />
          <KpiCard
            label="Kunden ohne Rechnung"
            value={stats.customersWithoutInvoice}
            icon={FileText}
            href="/dashboard/clients"
            trend={URGENCY_TREND.action}
            urgency="action"
          />
          <KpiCard
            label="Unbezahlte Rechnungen"
            value={stats.unpaidInvoices}
            icon={Receipt}
            href="/dashboard/finance"
            trend={URGENCY_TREND.urgent}
            urgency="urgent"
          />
          <KpiCard
            label="Aktive Kunden"
            value={stats.activeCustomers}
            icon={CheckCircle2}
            href="/dashboard/clients"
            trend={URGENCY_TREND.completed}
            urgency="completed"
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-soft">
        Meine Aufgaben
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Meine offenen Leads"
          value={stats.openLeads}
          icon={Target}
          href="/dashboard/leads"
          trend={URGENCY_TREND.waiting}
          urgency="waiting"
        />
        <KpiCard
          label="Kunden mit offenen Aufgaben"
          value={stats.customersRequiringAction}
          icon={Users}
          href="/dashboard/clients"
          trend={URGENCY_TREND.action}
          urgency="action"
        />
        <KpiCard
          label="Verträge fehlen"
          value={stats.contractsMissing}
          icon={FileText}
          href="/dashboard/clients"
          trend={URGENCY_TREND.action}
          urgency="action"
        />
        <KpiCard
          label="Rechnungen fehlen"
          value={stats.invoicesMissing}
          icon={Receipt}
          href="/dashboard/clients"
          trend={URGENCY_TREND.urgent}
          urgency="urgent"
        />
      </div>
    </div>
  );
}
