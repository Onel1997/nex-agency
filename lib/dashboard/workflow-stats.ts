import { createClient } from "@/lib/supabase/server";
import { PIPELINE_STATUSES } from "./constants";
import type { InvoiceRecord, Lead } from "./types";
import {
  fetchCommissionEntries,
  fetchCommissionPayoutProfileIds,
  groupLatestCommissionEntryByClient,
  groupPaidProfilesByClient,
} from "./commission-entries-data";
import {
  customerWorkflowRequiresAction,
  groupInvoicesByClientId,
  isActiveCustomerWorkflowStage,
  resolveCustomerWorkflowStatus,
  type CustomerWorkflowStage,
  type WorkflowStatus,
} from "./workflow-status";

export interface WorkflowDashboardStats {
  openLeads: number;
  wonLeadsWithoutContract: number;
  customersWithoutInvoice: number;
  unpaidInvoices: number;
  activeCustomers: number;
  customersRequiringAction: number;
  contractsMissing: number;
  invoicesMissing: number;
}

export interface WorkflowClientRow {
  id: string;
  company_name: string;
  contract_start_date: string | null;
  contract_status: string | null;
  setup_fee_cents: number | null;
  monthly_retainer_cents: number | null;
  monthly_revenue_cents: number | null;
  lead_estimated_value_cents: number | null;
}

export interface WorkflowActionItem {
  id: string;
  label: string;
  href: string;
  stage: CustomerWorkflowStage | "won_lead";
  urgency: WorkflowStatus<CustomerWorkflowStage>["urgency"] | "urgent";
}

const CLIENT_WORKFLOW_SELECT = `
  id,
  company_name,
  contract_start_date,
  contract_status,
  setup_fee_cents,
  monthly_retainer_cents,
  monthly_revenue_cents,
  lead_estimated_value_cents
`;

const UNPAID_INVOICE_STATUSES = ["draft", "sent", "overdue"] as const;

function mapInvoiceRow(row: Record<string, unknown>): InvoiceRecord {
  return {
    id: row.id as string,
    client_id: row.client_id as string,
    invoice_number: row.invoice_number as string,
    amount_cents: (row.amount_cents as number | null) ?? 0,
    status: row.status as InvoiceRecord["status"],
    created_by: (row.created_by as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: (row.updated_at as string) ?? (row.created_at as string),
    due_date: (row.due_date as string | null) ?? null,
    invoice_type: (row.invoice_type as InvoiceRecord["invoice_type"]) ?? null,
    billing_period_year: (row.billing_period_year as number | null) ?? null,
    billing_period_month: (row.billing_period_month as number | null) ?? null,
    subtotal_cents: (row.subtotal_cents as number | null) ?? 0,
    tax_amount_cents: (row.tax_amount_cents as number | null) ?? 0,
    total_amount_cents: (row.total_amount_cents as number | null) ?? 0,
    vat_rate: (row.vat_rate as number | null) ?? 0,
    contract_id: (row.contract_id as string | null) ?? null,
    company_name: undefined,
    customer_number: undefined,
  };
}

async function fetchWorkflowClients(): Promise<WorkflowClientRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("clients")
    .select(CLIENT_WORKFLOW_SELECT)
    .eq("is_archived", false)
    .is("deleted_at", null);

  let { data, error } = await query;

  if (error && error.message.toLowerCase().includes("deleted_at")) {
    ({ data, error } = await supabase
      .from("clients")
      .select(CLIENT_WORKFLOW_SELECT)
      .eq("is_archived", false));
  }

  if (error && error.message.toLowerCase().includes("is_archived")) {
    ({ data, error } = await supabase.from("clients").select(CLIENT_WORKFLOW_SELECT));
  }

  if (error) throw new Error(error.message);
  return (data ?? []) as WorkflowClientRow[];
}

async function fetchWorkflowInvoices(): Promise<InvoiceRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, client_id, invoice_number, amount_cents, status, created_by, created_at, updated_at, due_date, invoice_type, billing_period_year, billing_period_month, subtotal_cents, tax_amount_cents, total_amount_cents, vat_rate, contract_id",
    );

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapInvoiceRow(row as Record<string, unknown>));
}

async function fetchWorkflowLeads(): Promise<Pick<Lead, "id" | "status" | "converted_to_client" | "company_name">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("id, status, converted_to_client, company_name");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    status: row.status as Lead["status"],
    converted_to_client: Boolean(row.converted_to_client),
    company_name: row.company_name as string,
  }));
}

export function computeWorkflowDashboardStats(input: {
  leads: Pick<Lead, "status" | "converted_to_client">[];
  clients: WorkflowClientRow[];
  invoices: InvoiceRecord[];
  entriesByClient?: Map<string, import("./types").CommissionEntryRecord>;
  paidProfilesByClient?: Map<string, Set<string>>;
}): WorkflowDashboardStats {
  const invoicesByClient = groupInvoicesByClientId(input.invoices);
  const entriesByClient = input.entriesByClient ?? new Map();
  const paidProfilesByClient = input.paidProfilesByClient ?? new Map();

  let customersWithoutInvoice = 0;
  let activeCustomers = 0;
  let customersRequiringAction = 0;
  let contractsMissing = 0;
  let invoicesMissing = 0;

  for (const client of input.clients) {
    const status = resolveCustomerWorkflowStatus(
      client,
      invoicesByClient.get(client.id) ?? [],
      entriesByClient.get(client.id) ?? null,
      paidProfilesByClient.get(client.id) ?? new Set(),
    );

    if (status.stage === "won_no_contract") contractsMissing += 1;
    if (status.stage === "contract_no_invoice") invoicesMissing += 1;
    if (status.stage === "contract_no_invoice") customersWithoutInvoice += 1;
    if (isActiveCustomerWorkflowStage(status.stage)) activeCustomers += 1;
    if (customerWorkflowRequiresAction(status)) customersRequiringAction += 1;
  }

  const openLeads = input.leads.filter((lead) =>
    PIPELINE_STATUSES.includes(lead.status),
  ).length;

  const wonLeadsNotConverted = input.leads.filter(
    (lead) => lead.status === "won" && !lead.converted_to_client,
  ).length;

  const unpaidInvoices = input.invoices.filter((invoice) =>
    UNPAID_INVOICE_STATUSES.includes(
      invoice.status as (typeof UNPAID_INVOICE_STATUSES)[number],
    ),
  ).length;

  return {
    openLeads,
    wonLeadsWithoutContract: wonLeadsNotConverted + contractsMissing,
    customersWithoutInvoice,
    unpaidInvoices,
    activeCustomers,
    customersRequiringAction,
    contractsMissing,
    invoicesMissing,
  };
}

export async function getWorkflowDashboardStats(): Promise<WorkflowDashboardStats> {
  const supabase = await createClient();
  const [leads, clients, invoices, commissionEntries, commissionPayoutProfiles] =
    await Promise.all([
      fetchWorkflowLeads(),
      fetchWorkflowClients(),
      fetchWorkflowInvoices(),
      fetchCommissionEntries(supabase),
      fetchCommissionPayoutProfileIds(supabase),
    ]);

  const entriesByClient = groupLatestCommissionEntryByClient(commissionEntries);
  const paidProfilesByClient = groupPaidProfilesByClient(
    entriesByClient,
    commissionPayoutProfiles,
  );

  return computeWorkflowDashboardStats({
    leads,
    clients,
    invoices,
    entriesByClient,
    paidProfilesByClient,
  });
}

export async function getWorkflowActionItems(
  limit = 8,
): Promise<WorkflowActionItem[]> {
  const supabase = await createClient();
  const [leads, clients, invoices, commissionEntries, commissionPayoutProfiles] =
    await Promise.all([
      fetchWorkflowLeads(),
      fetchWorkflowClients(),
      fetchWorkflowInvoices(),
      fetchCommissionEntries(supabase),
      fetchCommissionPayoutProfileIds(supabase),
    ]);

  const invoicesByClient = groupInvoicesByClientId(invoices);
  const entriesByClient = groupLatestCommissionEntryByClient(commissionEntries);
  const paidProfilesByClient = groupPaidProfilesByClient(
    entriesByClient,
    commissionPayoutProfiles,
  );
  const items: WorkflowActionItem[] = [];

  for (const lead of leads) {
    if (lead.status === "won" && !lead.converted_to_client) {
      items.push({
        id: `lead-${lead.id}`,
        label: `${lead.company_name} — Lead gewonnen, noch kein Kunde`,
        href: `/dashboard/leads/${lead.id}`,
        stage: "won_lead",
        urgency: "urgent",
      });
    }
  }

  for (const client of clients) {
    const status = resolveCustomerWorkflowStatus(
      client,
      invoicesByClient.get(client.id) ?? [],
      entriesByClient.get(client.id) ?? null,
      paidProfilesByClient.get(client.id) ?? new Set(),
    );

    if (!customerWorkflowRequiresAction(status)) continue;

    const commissionLabel =
      status.stage === "both_commissions_open"
        ? "Beide Provisionen offen"
        : status.stage === "setter_commission_open"
          ? "Setter-Provision offen"
          : status.stage === "closer_commission_open"
            ? "Closer-Provision offen"
            : status.stage === "commission_approved"
              ? "Provision freigegeben"
              : status.stage === "commission_paid"
                ? "Provision ausgezahlt"
                : status.stage === "won_no_contract"
                  ? "Vertrag fehlt"
                  : status.stage === "contract_no_invoice"
                    ? "Rechnung fehlt"
                    : "Rechnung offen";

    items.push({
      id: `client-${client.id}`,
      label: `${client.company_name} — ${commissionLabel}`,
      href: `/dashboard/clients/${client.id}?tab=${
        status.stage.includes("commission")
          ? "contracts"
          : status.stage === "won_no_contract"
            ? "contracts"
            : "invoices"
      }`,
      stage: status.stage,
      urgency: status.urgency,
    });
  }

  const urgencyRank: Record<WorkflowActionItem["urgency"], number> = {
    urgent: 0,
    action: 1,
    waiting: 2,
    completed: 3,
  };

  return items
    .sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency])
    .slice(0, limit);
}

export async function getClientWorkflowStatusMap(): Promise<
  Map<string, WorkflowStatus<CustomerWorkflowStage>>
> {
  const supabase = await createClient();
  const [clients, invoices, commissionEntries, commissionPayoutProfiles] =
    await Promise.all([
      fetchWorkflowClients(),
      fetchWorkflowInvoices(),
      fetchCommissionEntries(supabase),
      fetchCommissionPayoutProfileIds(supabase),
    ]);
  const invoicesByClient = groupInvoicesByClientId(invoices);
  const entriesByClient = groupLatestCommissionEntryByClient(commissionEntries);
  const paidProfilesByClient = groupPaidProfilesByClient(
    entriesByClient,
    commissionPayoutProfiles,
  );
  const map = new Map<string, WorkflowStatus<CustomerWorkflowStage>>();

  for (const client of clients) {
    map.set(
      client.id,
      resolveCustomerWorkflowStatus(
        client,
        invoicesByClient.get(client.id) ?? [],
        entriesByClient.get(client.id) ?? null,
        paidProfilesByClient.get(client.id) ?? new Set(),
      ),
    );
  }

  return map;
}
