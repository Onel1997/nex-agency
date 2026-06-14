import {
  CUSTOMER_WORKFLOW_STAGE_LABELS,
  LEAD_WORKFLOW_STAGE_LABELS,
  WORKFLOW_URGENCY_STYLES,
  type CustomerWorkflowStage,
  type LeadWorkflowStage,
  type WorkflowUrgency,
} from "@/lib/dashboard/workflow-status";

interface WorkflowStatusBadgeProps {
  label: string;
  urgency: WorkflowUrgency;
}

export function WorkflowStatusBadge({ label, urgency }: WorkflowStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${WORKFLOW_URGENCY_STYLES[urgency]}`}
    >
      {label}
    </span>
  );
}

export function LeadWorkflowBadge({
  stage,
  urgency,
}: {
  stage: LeadWorkflowStage;
  urgency: WorkflowUrgency;
}) {
  return (
    <WorkflowStatusBadge label={LEAD_WORKFLOW_STAGE_LABELS[stage]} urgency={urgency} />
  );
}

export function CustomerWorkflowBadge({
  stage,
  urgency,
}: {
  stage: CustomerWorkflowStage;
  urgency: WorkflowUrgency;
}) {
  return (
    <WorkflowStatusBadge
      label={CUSTOMER_WORKFLOW_STAGE_LABELS[stage]}
      urgency={urgency}
    />
  );
}
