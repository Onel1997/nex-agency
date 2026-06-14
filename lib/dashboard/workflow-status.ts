import type { LeadStatus } from "./constants";
import {
  canCreateSetupInvoice,
  filterInvoicesForClient,
  hasActiveContract,
  hasRetainerContract,
  hasSetupFee,
} from "./contract-invoices";
import { isClientSetupInvoicePaid } from "./client-freelancer-payout";
import {
  resolveClientCommissionPayoutStatus,
  type ClientCommissionPayoutStatus,
} from "./client-commission-status";
import type { CommissionEntryRecord } from "./types";
import type { InvoiceRecord } from "./types";

export type LeadWorkflowStage =
  | "new"
  | "contacted"
  | "scheduled"
  | "open_for_closer"
  | "qualified"
  | "offer"
  | "won";

export type CustomerCommissionWorkflowStage =
  | "setter_commission_open"
  | "closer_commission_open"
  | "both_commissions_open"
  | "commission_approved"
  | "commission_paid";

export type CustomerWorkflowStage =
  | "won_no_contract"
  | "contract_no_invoice"
  | "invoice_unpaid"
  | "active_paid"
  | CustomerCommissionWorkflowStage;

export type WorkflowUrgency = "urgent" | "action" | "waiting" | "completed";

export interface WorkflowStatus<TStage extends string> {
  stage: TStage;
  urgency: WorkflowUrgency;
}

export const LEAD_WORKFLOW_STAGE_LABELS: Record<LeadWorkflowStage, string> = {
  new: "Neu",
  contacted: "Kontaktiert",
  scheduled: "Terminiert",
  open_for_closer: "Terminierter Termin",
  qualified: "Qualifiziert",
  offer: "Angebot",
  won: "Gewonnen",
};

export const CUSTOMER_WORKFLOW_STAGE_LABELS: Record<CustomerWorkflowStage, string> = {
  won_no_contract: "Gewonnen — kein Vertrag",
  contract_no_invoice: "Vertrag — keine Rechnung",
  invoice_unpaid: "Rechnung offen",
  active_paid: "Aktiv & bezahlt",
  setter_commission_open: "Setter-Provision offen",
  closer_commission_open: "Closer-Provision offen",
  both_commissions_open: "Beide Provisionen offen",
  commission_approved: "Provision freigegeben",
  commission_paid: "Provision ausgezahlt",
};

export const WORKFLOW_URGENCY_LABELS: Record<WorkflowUrgency, string> = {
  urgent: "Dringend",
  action: "Aktion nötig",
  waiting: "Wartet",
  completed: "Abgeschlossen",
};

export const WORKFLOW_URGENCY_STYLES: Record<WorkflowUrgency, string> = {
  urgent: "bg-red-500/15 text-red-200 ring-red-500/30",
  action: "bg-orange-500/15 text-orange-200 ring-orange-500/30",
  waiting: "bg-amber-500/15 text-amber-200 ring-amber-500/30",
  completed: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
};

type WorkflowClientFields = {
  id: string;
  contract_start_date?: string | null;
  contract_status?: string | null;
  setup_fee_cents?: number | null;
  monthly_retainer_cents?: number | null;
  monthly_revenue_cents?: number | null;
  lead_estimated_value_cents?: number | null;
};

type WorkflowLeadFields = {
  status: LeadStatus;
  converted_to_client: boolean;
  closer_id?: string | null;
};

const UNPAID_INVOICE_STATUSES = new Set(["draft", "sent", "overdue"]);

export function resolveLeadWorkflowStatus(
  lead: WorkflowLeadFields,
): WorkflowStatus<LeadWorkflowStage> | null {
  if (lead.status === "lost") return null;

  if (lead.status === "won") {
    return {
      stage: "won",
      urgency: lead.converted_to_client ? "completed" : "urgent",
    };
  }

  if (lead.status === "new") {
    return { stage: "new", urgency: "waiting" };
  }

  if (lead.status === "contacted") {
    return { stage: "contacted", urgency: "waiting" };
  }

  if (lead.status === "scheduled") {
    if (!lead.closer_id) {
      return { stage: "open_for_closer", urgency: "action" };
    }
    return { stage: "scheduled", urgency: "action" };
  }

  if (lead.status === "qualified") {
    return { stage: "qualified", urgency: "action" };
  }

  if (lead.status === "proposal") {
    return { stage: "offer", urgency: "action" };
  }

  return null;
}

export function resolveCommissionWorkflowStage(
  payoutStatus: ClientCommissionPayoutStatus,
): WorkflowStatus<CustomerCommissionWorkflowStage> | null {
  const entry = payoutStatus.entry;
  if (!entry || entry.status === "cancelled") return null;

  if (entry.status === "paid") {
    return { stage: "commission_paid", urgency: "completed" };
  }

  if (entry.status === "approved") {
    return { stage: "commission_approved", urgency: "action" };
  }

  const setterOpen =
    Boolean(entry.setter_id) &&
    entry.setter_commission_cents > 0 &&
    !payoutStatus.setterPaid;
  const closerOpen =
    Boolean(entry.closer_id) &&
    entry.closer_commission_cents > 0 &&
    !payoutStatus.closerPaid;

  if (setterOpen && closerOpen) {
    return { stage: "both_commissions_open", urgency: "action" };
  }

  if (setterOpen) {
    return { stage: "setter_commission_open", urgency: "action" };
  }

  if (closerOpen) {
    return { stage: "closer_commission_open", urgency: "action" };
  }

  return null;
}

export function resolveCustomerWorkflowStatus(
  client: WorkflowClientFields,
  invoices: InvoiceRecord[],
  commissionEntry: CommissionEntryRecord | null = null,
  paidCommissionProfileIds: Set<string> = new Set(),
): WorkflowStatus<CustomerWorkflowStage> {
  const clientInvoices = filterInvoicesForClient(invoices, client.id);
  const operationalInvoices = clientInvoices.filter(
    (invoice) => invoice.status !== "cancelled",
  );

  if (!hasActiveContract(client)) {
    return { stage: "won_no_contract", urgency: "action" };
  }

  const needsSetupInvoice = canCreateSetupInvoice(client, clientInvoices);
  const needsAnyInvoice =
    operationalInvoices.length === 0 && hasRetainerContract(client);

  if (needsSetupInvoice || needsAnyInvoice) {
    return { stage: "contract_no_invoice", urgency: "action" };
  }

  const unpaidInvoices = operationalInvoices.filter((invoice) =>
    UNPAID_INVOICE_STATUSES.has(invoice.status),
  );

  if (unpaidInvoices.length > 0) {
    const hasOverdue = unpaidInvoices.some((invoice) => invoice.status === "overdue");
    const onlySent = unpaidInvoices.every((invoice) => invoice.status === "sent");

    return {
      stage: "invoice_unpaid",
      urgency: hasOverdue ? "urgent" : onlySent ? "waiting" : "action",
    };
  }

  const setupRequired = hasSetupFee(client);
  const setupPaid = !setupRequired || isClientSetupInvoicePaid(clientInvoices);

  if (!setupPaid) {
    return { stage: "invoice_unpaid", urgency: "action" };
  }

  const payoutStatus = resolveClientCommissionPayoutStatus(
    commissionEntry,
    paidCommissionProfileIds,
  );
  const commissionStage = resolveCommissionWorkflowStage(payoutStatus);
  if (commissionStage) {
    return commissionStage;
  }

  return { stage: "active_paid", urgency: "completed" };
}

export function customerWorkflowRequiresAction(
  status: WorkflowStatus<CustomerWorkflowStage>,
): boolean {
  return status.urgency === "urgent" || status.urgency === "action";
}

export function groupInvoicesByClientId(
  invoices: InvoiceRecord[],
): Map<string, InvoiceRecord[]> {
  const grouped = new Map<string, InvoiceRecord[]>();

  for (const invoice of invoices) {
    const existing = grouped.get(invoice.client_id) ?? [];
    existing.push(invoice);
    grouped.set(invoice.client_id, existing);
  }

  return grouped;
}
