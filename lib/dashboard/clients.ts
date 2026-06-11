import { createClient } from "@/lib/supabase/server";
import type { BillingCycle, CommissionStatus } from "./constants";
import type { ClientDetailRecord, ClientRecord } from "./types";

function formatMemberName(
  member: { full_name: string | null; email: string } | null | undefined,
): string | null {
  if (!member) return null;
  return member.full_name?.trim() || member.email.split("@")[0];
}

const CLIENT_SELECT = `
  id,
  lead_id,
  company_name,
  customer_number,
  contact_name,
  email,
  phone,
  website,
  responsible_member_id,
  lead_estimated_value_cents,
  monthly_retainer_cents,
  one_time_project_value_cents,
  currency,
  created_at,
  responsible_member:profiles!clients_responsible_member_id_fkey(full_name, email)
`;

const CLIENT_DETAIL_SELECT = `
  ${CLIENT_SELECT},
  monthly_revenue_cents,
  setup_fee_cents,
  contract_start_date,
  billing_cycle,
  next_invoice_date,
  last_invoice_date,
  auto_invoice_enabled,
  total_revenue_cents,
  commission_status,
  commission_total_cents,
  commission_paid_cents,
  commission_outstanding_cents
`;

function mapClientRow(row: Record<string, unknown>): ClientRecord {
  const responsibleMember = Array.isArray(row.responsible_member)
    ? row.responsible_member[0]
    : row.responsible_member;

  return {
    id: row.id as string,
    lead_id: row.lead_id as string,
    company_name: row.company_name as string,
    customer_number: (row.customer_number as string | null) ?? null,
    contact_name: (row.contact_name as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    responsible_member_id: (row.responsible_member_id as string | null) ?? null,
    lead_estimated_value_cents:
      (row.lead_estimated_value_cents as number | null) ?? null,
    monthly_retainer_cents: (row.monthly_retainer_cents as number | null) ?? null,
    one_time_project_value_cents:
      (row.one_time_project_value_cents as number | null) ?? null,
    currency: (row.currency as string) ?? "EUR",
    created_at: row.created_at as string,
    responsible_member_name: formatMemberName(
      responsibleMember as { full_name: string | null; email: string } | null,
    ),
  };
}

export async function getClients(): Promise<ClientRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapClientRow(row as Record<string, unknown>));
}

export async function getRecentClients(limit = 5): Promise<ClientRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapClientRow(row as Record<string, unknown>));
}

export async function getClientById(id: string): Promise<ClientRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapClientRow(data as Record<string, unknown>);
}

function mapClientDetailRow(row: Record<string, unknown>): ClientDetailRecord {
  const base = mapClientRow(row);
  return {
    ...base,
    monthly_revenue_cents: (row.monthly_revenue_cents as number | null) ?? null,
    setup_fee_cents: (row.setup_fee_cents as number | null) ?? null,
    contract_start_date: (row.contract_start_date as string | null) ?? null,
    billing_cycle: ((row.billing_cycle as BillingCycle | null) ?? "monthly") as BillingCycle,
    next_invoice_date: (row.next_invoice_date as string | null) ?? null,
    last_invoice_date: (row.last_invoice_date as string | null) ?? null,
    auto_invoice_enabled: Boolean(row.auto_invoice_enabled),
    total_revenue_cents: (row.total_revenue_cents as number | null) ?? null,
    commission_status: (row.commission_status as CommissionStatus) ?? "none",
    commission_total_cents: (row.commission_total_cents as number) ?? 0,
    commission_paid_cents: (row.commission_paid_cents as number) ?? 0,
    commission_outstanding_cents:
      (row.commission_outstanding_cents as number) ?? 0,
  };
}

export async function getClientDetailById(
  id: string,
): Promise<ClientDetailRecord | null> {
  const supabase = await createClient();

  let { data, error } = await supabase
    .from("clients")
    .select(CLIENT_DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (
    error &&
    (error.message.includes("commission_total_cents") ||
      error.message.includes("contract_start_date") ||
      error.message.includes("billing_cycle"))
  ) {
    ({ data, error } = await supabase
      .from("clients")
      .select(
        `
        ${CLIENT_SELECT},
        monthly_revenue_cents,
        setup_fee_cents,
        total_revenue_cents,
        commission_status
      `,
      )
      .eq("id", id)
      .maybeSingle());
  }

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapClientDetailRow(data as Record<string, unknown>);
}
