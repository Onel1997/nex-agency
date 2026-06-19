import type { SupabaseClient } from "@supabase/supabase-js";
import type { RetainerPaymentRecord, RetainerPeriodInvoiceRef } from "./retainer";
import { isContractStatusSchemaMissingError } from "./contract-status";

import {
  isCommissionPayoutsSchemaMissingError,
  isCommissionSchemaMissingError,
} from "./commission";
import { isClientFreelancerPayoutsSchemaMissingError } from "./client-freelancer-payout";
import type {
  ClientFreelancerPayoutRecord,
  CommissionPayoutRecord,
} from "./types";

export function isRetainerSchemaMissingError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("does not exist") &&
    (normalized.includes("contract_start_date") ||
      normalized.includes("client_retainer_payments"))
  );
}

const CLIENT_REVENUE_MEMBER_SELECT = `
  responsible_member:profiles!clients_responsible_member_id_fkey(
    full_name,
    email,
    commission_rate
  )
`;

const CLIENT_COMMISSION_COLUMNS = `
  commission_total_cents,
  commission_paid_cents,
  commission_outstanding_cents
`;

const CLIENT_FREELANCER_COLUMNS = `
  assigned_freelancer_id,
  freelancer_commission_rate,
  freelancer_payout_cents,
  freelancer_paid_cents,
  freelancer_outstanding_cents,
  freelancer_payout_status
`;

const CLIENT_FREELANCER_MEMBER_SELECT = `
  assigned_freelancer:profiles!clients_assigned_freelancer_id_fkey(
    full_name,
    email
  )
`;

export const CLIENT_REVENUE_SELECT_WITH_CONTRACT = `
  id,
  company_name,
  responsible_member_id,
  setter_id,
  closer_id,
  acquired_by,
  monthly_revenue_cents,
  monthly_retainer_cents,
  setup_fee_cents,
  contract_start_date,
  contract_status,
  auto_invoice_enabled,
  total_revenue_cents,
  commission_status,
  ${CLIENT_COMMISSION_COLUMNS},
  ${CLIENT_FREELANCER_COLUMNS},
  currency,
  ${CLIENT_REVENUE_MEMBER_SELECT},
  ${CLIENT_FREELANCER_MEMBER_SELECT},
  setter:profiles!clients_setter_id_fkey(full_name, email, setter_commission_rate, agency_role),
  closer:profiles!clients_closer_id_fkey(full_name, email, closer_commission_rate, agency_role),
  lead:leads!clients_lead_id_fkey(
    owner_id,
    setter_id,
    created_by,
    setter:profiles!leads_setter_id_fkey(full_name, email, setter_commission_rate, agency_role),
    creator:profiles!leads_created_by_fkey(full_name, email, setter_commission_rate, agency_role)
  )
`;

export const CLIENT_REVENUE_SELECT_WITH_CONTRACT_NO_STATUS = `
  id,
  company_name,
  responsible_member_id,
  monthly_revenue_cents,
  monthly_retainer_cents,
  setup_fee_cents,
  contract_start_date,
  auto_invoice_enabled,
  total_revenue_cents,
  commission_status,
  ${CLIENT_COMMISSION_COLUMNS},
  ${CLIENT_FREELANCER_COLUMNS},
  currency,
  ${CLIENT_REVENUE_MEMBER_SELECT},
  ${CLIENT_FREELANCER_MEMBER_SELECT}
`;

export const CLIENT_REVENUE_SELECT_LEGACY = `
  id,
  company_name,
  responsible_member_id,
  monthly_revenue_cents,
  setup_fee_cents,
  total_revenue_cents,
  commission_status,
  currency,
  ${CLIENT_REVENUE_MEMBER_SELECT}
`;

export const CLIENT_REVENUE_SELECT_WITH_CONTRACT_NO_COMMISSION = `
  id,
  company_name,
  responsible_member_id,
  monthly_revenue_cents,
  setup_fee_cents,
  contract_start_date,
  total_revenue_cents,
  commission_status,
  currency,
  ${CLIENT_REVENUE_MEMBER_SELECT}
`;

export const PERFORMANCE_CLIENT_SELECT_WITH_CONTRACT = `
  id,
  created_at,
  setter_id,
  closer_id,
  monthly_revenue_cents,
  setup_fee_cents,
  one_time_project_value_cents,
  contract_start_date,
  total_revenue_cents,
  commission_status,
  ${CLIENT_COMMISSION_COLUMNS},
  ${CLIENT_FREELANCER_COLUMNS}
`;

export const PERFORMANCE_CLIENT_SELECT_LEGACY = `
  id,
  created_at,
  setter_id,
  closer_id,
  monthly_revenue_cents,
  setup_fee_cents,
  total_revenue_cents,
  commission_status
`;

export const PERFORMANCE_CLIENT_SELECT_WITH_CONTRACT_NO_COMMISSION = `
  id,
  created_at,
  setter_id,
  closer_id,
  monthly_revenue_cents,
  setup_fee_cents,
  one_time_project_value_cents,
  contract_start_date,
  total_revenue_cents,
  commission_status,
  ${CLIENT_FREELANCER_COLUMNS}
`;

async function fetchClientRowsWithFallback(
  supabase: SupabaseClient,
  withContract: string,
  withContractNoCommission: string,
  legacy: string,
  orderBy?: string,
  withContractNoStatus?: string,
): Promise<{ rows: Record<string, unknown>[]; hasRetainerSchema: boolean; hasCommissionSchema: boolean }> {
  const fullResult = orderBy
    ? await supabase.from("clients").select(withContract).order(orderBy)
    : await supabase.from("clients").select(withContract);

  if (!fullResult.error) {
    return {
      rows: (fullResult.data ?? []) as unknown as Record<string, unknown>[],
      hasRetainerSchema: true,
      hasCommissionSchema: true,
    };
  }

  if (
    withContractNoStatus &&
    isContractStatusSchemaMissingError(fullResult.error.message)
  ) {
    const noStatusResult = orderBy
      ? await supabase.from("clients").select(withContractNoStatus).order(orderBy)
      : await supabase.from("clients").select(withContractNoStatus);

    if (!noStatusResult.error) {
      return {
        rows: (noStatusResult.data ?? []) as unknown as Record<string, unknown>[],
        hasRetainerSchema: true,
        hasCommissionSchema: true,
      };
    }
  }

  if (isCommissionSchemaMissingError(fullResult.error.message)) {
    const noCommission = orderBy
      ? supabase.from("clients").select(withContractNoCommission).order(orderBy)
      : supabase.from("clients").select(withContractNoCommission);

    const noCommissionResult = await noCommission;
    if (!noCommissionResult.error) {
      return {
        rows: (noCommissionResult.data ?? []) as unknown as Record<string, unknown>[],
        hasRetainerSchema: true,
        hasCommissionSchema: false,
      };
    }

    if (!isRetainerSchemaMissingError(noCommissionResult.error.message)) {
      throw new Error(noCommissionResult.error.message);
    }
  } else if (!isRetainerSchemaMissingError(fullResult.error.message)) {
    throw new Error(fullResult.error.message);
  }

  const legacyResult = orderBy
    ? await supabase.from("clients").select(legacy).order(orderBy)
    : await supabase.from("clients").select(legacy);

  if (legacyResult.error) throw new Error(legacyResult.error.message);

  return {
    rows: (legacyResult.data ?? []) as unknown as Record<string, unknown>[],
    hasRetainerSchema: false,
    hasCommissionSchema: false,
  };
}

export async function fetchClientRevenueRows(
  supabase: SupabaseClient,
): Promise<{
  rows: Record<string, unknown>[];
  hasRetainerSchema: boolean;
  hasCommissionSchema: boolean;
}> {
  return fetchClientRowsWithFallback(
    supabase,
    CLIENT_REVENUE_SELECT_WITH_CONTRACT,
    CLIENT_REVENUE_SELECT_WITH_CONTRACT_NO_COMMISSION,
    CLIENT_REVENUE_SELECT_LEGACY,
    "company_name",
    CLIENT_REVENUE_SELECT_WITH_CONTRACT_NO_STATUS,
  );
}

export async function fetchPerformanceClientRows(
  supabase: SupabaseClient,
): Promise<{
  rows: Record<string, unknown>[];
  hasRetainerSchema: boolean;
  hasCommissionSchema: boolean;
}> {
  return fetchClientRowsWithFallback(
    supabase,
    PERFORMANCE_CLIENT_SELECT_WITH_CONTRACT,
    PERFORMANCE_CLIENT_SELECT_WITH_CONTRACT_NO_COMMISSION,
    PERFORMANCE_CLIENT_SELECT_LEGACY,
  );
}

export async function fetchRetainerPayments(
  supabase: SupabaseClient,
): Promise<RetainerPaymentRecord[]> {
  const { data, error } = await supabase
    .from("client_retainer_payments")
    .select("client_id, period_year, period_month, status, paid_at");

  if (!error) {
    return (data ?? []).map((payment) => ({
      period_year: payment.period_year as number,
      period_month: payment.period_month as number,
      status: payment.status as RetainerPaymentRecord["status"],
      paid_at: (payment.paid_at as string | null) ?? null,
      client_id: payment.client_id as string,
    }));
  }

  if (isRetainerSchemaMissingError(error.message)) {
    return [];
  }

  throw new Error(error.message);
}

export function groupPaymentsByClient(
  payments: Array<RetainerPaymentRecord & { client_id?: string }>,
) {
  const paymentsByClient = new Map<string, RetainerPaymentRecord[]>();

  for (const payment of payments) {
    const clientId = payment.client_id;
    if (!clientId) continue;

    const current = paymentsByClient.get(clientId) ?? [];
    current.push({
      period_year: payment.period_year,
      period_month: payment.period_month,
      status: payment.status,
      paid_at: payment.paid_at,
    });
    paymentsByClient.set(clientId, current);
  }

  return paymentsByClient;
}

export interface RetainerInvoiceRecord extends RetainerPeriodInvoiceRef {
  client_id: string;
}

export async function fetchRetainerInvoices(
  supabase: SupabaseClient,
): Promise<RetainerInvoiceRecord[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "client_id, billing_period_year, billing_period_month, status, invoice_type, invoice_number",
    )
    .neq("status", "cancelled");

  if (error) {
    if (
      error.message.includes("invoice_type") ||
      error.message.includes("billing_period_year")
    ) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((invoice) => ({
    client_id: invoice.client_id as string,
    billing_period_year: (invoice.billing_period_year as number | null) ?? null,
    billing_period_month: (invoice.billing_period_month as number | null) ?? null,
    status: invoice.status as string,
    invoice_type: (invoice.invoice_type as string | null) ?? null,
    invoice_number: (invoice.invoice_number as string | null) ?? null,
  }));
}

export function groupRetainerInvoicesByClient(
  invoices: RetainerInvoiceRecord[],
): Map<string, RetainerPeriodInvoiceRef[]> {
  const invoicesByClient = new Map<string, RetainerPeriodInvoiceRef[]>();

  for (const invoice of invoices) {
    const current = invoicesByClient.get(invoice.client_id) ?? [];
    current.push({
      billing_period_year: invoice.billing_period_year,
      billing_period_month: invoice.billing_period_month,
      status: invoice.status,
      invoice_type: invoice.invoice_type,
      invoice_number: invoice.invoice_number,
    });
    invoicesByClient.set(invoice.client_id, current);
  }

  return invoicesByClient;
}

export async function fetchCommissionPayouts(
  supabase: SupabaseClient,
): Promise<Array<CommissionPayoutRecord & { client_id: string }>> {
  const { data, error } = await supabase
    .from("client_commission_payouts")
    .select("id, client_id, amount_cents, payout_date, created_at")
    .order("payout_date", { ascending: false });

  if (!error) {
    return (data ?? []).map((payout) => ({
      id: payout.id as string,
      client_id: payout.client_id as string,
      amount_cents: payout.amount_cents as number,
      payout_date: payout.payout_date as string,
      created_at: payout.created_at as string,
    }));
  }

  if (isCommissionPayoutsSchemaMissingError(error.message)) {
    return [];
  }

  throw new Error(error.message);
}

export function groupCommissionPayoutsByClient(
  payouts: Array<CommissionPayoutRecord & { client_id?: string }>,
) {
  const payoutsByClient = new Map<string, CommissionPayoutRecord[]>();

  for (const payout of payouts) {
    const clientId = payout.client_id;
    if (!clientId) continue;

    const current = payoutsByClient.get(clientId) ?? [];
    current.push({
      id: payout.id,
      amount_cents: payout.amount_cents,
      payout_date: payout.payout_date,
      created_at: payout.created_at,
    });
    payoutsByClient.set(clientId, current);
  }

  return payoutsByClient;
}

export async function fetchClientFreelancerPayouts(
  supabase: SupabaseClient,
): Promise<Array<ClientFreelancerPayoutRecord & { client_id: string }>> {
  const { data, error } = await supabase
    .from("client_freelancer_payouts")
    .select("id, client_id, amount_cents, paid_at, created_at")
    .order("paid_at", { ascending: false });

  if (!error) {
    return (data ?? []).map((payout) => ({
      id: payout.id as string,
      client_id: payout.client_id as string,
      amount_cents: payout.amount_cents as number,
      paid_at: payout.paid_at as string,
      created_at: payout.created_at as string,
    }));
  }

  if (isClientFreelancerPayoutsSchemaMissingError(error.message)) {
    return [];
  }

  throw new Error(error.message);
}

export function groupClientFreelancerPayoutsByClient(
  payouts: Array<ClientFreelancerPayoutRecord & { client_id?: string }>,
) {
  const payoutsByClient = new Map<string, ClientFreelancerPayoutRecord[]>();

  for (const payout of payouts) {
    const clientId = payout.client_id;
    if (!clientId) continue;

    const current = payoutsByClient.get(clientId) ?? [];
    current.push({
      id: payout.id,
      amount_cents: payout.amount_cents,
      paid_at: payout.paid_at,
      created_at: payout.created_at,
    });
    payoutsByClient.set(clientId, current);
  }

  return payoutsByClient;
}
