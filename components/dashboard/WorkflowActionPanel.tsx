import Link from "next/link";
import { WorkflowStatusBadge } from "@/components/dashboard/WorkflowStatusBadge";
import type { WorkflowActionItem } from "@/lib/dashboard/workflow-stats";
import {
  CUSTOMER_WORKFLOW_STAGE_LABELS,
  WORKFLOW_URGENCY_LABELS,
} from "@/lib/dashboard/workflow-status";

interface WorkflowActionPanelProps {
  items: WorkflowActionItem[];
  title: string;
}

export function WorkflowActionPanel({ items, title }: WorkflowActionPanelProps) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
        {title}
      </h2>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Keine offenen Workflow-Aufgaben.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-black/10 px-4 py-3 transition-colors hover:bg-white/5"
              >
                <span className="min-w-0 text-sm text-foreground">{item.label}</span>
                <WorkflowStatusBadge
                  label={
                    item.stage === "won_lead"
                      ? "Gewonnen"
                      : CUSTOMER_WORKFLOW_STAGE_LABELS[item.stage]
                  }
                  urgency={item.urgency}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-muted-soft">
        Legende: {WORKFLOW_URGENCY_LABELS.urgent} · {WORKFLOW_URGENCY_LABELS.action} ·{" "}
        {WORKFLOW_URGENCY_LABELS.waiting} · {WORKFLOW_URGENCY_LABELS.completed}
      </p>
    </div>
  );
}
