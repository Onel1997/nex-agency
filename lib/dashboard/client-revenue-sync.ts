import { syncCommissionAmounts, isCommissionSchemaMissingError } from "./commission";
import {
  isClientFreelancerSchemaMissingError,
  isClientSetupInvoicePaid,
  syncFreelancerPayoutAmounts,
} from "./client-freelancer-payout";
import { isContractStatusSchemaMissingError } from "./contract-status";
import { isRetainerSchemaMissingError } from "./retainer-data";
import { resolveInvoiceType } from "./invoice-type";
import {
  buildRetainerStats,
  hasActiveRetainer,
  type RetainerPaymentRecord,
} from "./retainer";
import { createClient } from "@/lib/supabase/server";

export interface PaidRetainerInvoiceStats {
  revenue_cents: number;
  paid_months: number;
}

type InvoiceRow = {
  subtotal_cents?: number | null;
  amount_cents?: number | null;
  invoice_type?: string | null;
  billing_period_year?: number | null;
  billing_period_month?: number | null;
  status?: string | null;
  client_id?: string;
};

function resolvePaidRetainerInvoiceSubtotalCents(invoice: InvoiceRow): number {
  return (
    (invoice.subtotal_cents as number | null) ??
    (invoice.amount_cents as number | null) ??
    0
  );
}

function isPaidRetainerInvoice(invoice: InvoiceRow): boolean {
  if (invoice.status !== "paid") return false;
  return resolveInvoiceType(invoice as import("./types").InvoiceRecord) === "retainer";
}

export function summarizePaidRetainerInvoices(
  invoices: InvoiceRow[],
): PaidRetainerInvoiceStats {
  const paidPeriods = new Set<string>();
  let revenueCents = 0;

  for (const invoice of invoices) {
    if (!isPaidRetainerInvoice(invoice)) continue;
    if (
      invoice.billing_period_year == null ||
      invoice.billing_period_month == null
    ) {
      continue;
    }

    revenueCents += resolvePaidRetainerInvoiceSubtotalCents(invoice);
    paidPeriods.add(
      `${invoice.billing_period_year}-${invoice.billing_period_month}`,
    );
  }

  return {
    revenue_cents: revenueCents,
    paid_months: paidPeriods.size,
  };
}

export async function fetchPaidRetainerInvoiceStatsByClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientIds?: string[],
): Promise<Map<string, PaidRetainerInvoiceStats>> {
  let query = supabase
    .from("invoices")
    .select(
      "client_id, subtotal_cents, amount_cents, invoice_type, billing_period_year, billing_period_month, status",
    )
    .eq("status", "paid");

  if (clientIds?.length) {
    query = query.in("client_id", clientIds);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const invoicesByClient = new Map<string, InvoiceRow[]>();

  for (const invoice of data ?? []) {
    if (!isPaidRetainerInvoice(invoice)) continue;

    const clientId = invoice.client_id as string;
    const current = invoicesByClient.get(clientId) ?? [];
    current.push(invoice);
    invoicesByClient.set(clientId, current);
  }

  const statsByClient = new Map<string, PaidRetainerInvoiceStats>();
  for (const [clientId, invoices] of invoicesByClient) {
    statsByClient.set(clientId, summarizePaidRetainerInvoices(invoices));
  }

  return statsByClient;
}

export async function getClientPayments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
): Promise<RetainerPaymentRecord[]> {
  const { data, error } = await supabase
    .from("client_retainer_payments")
    .select("period_year, period_month, status, paid_at")
    .eq("client_id", clientId);

  if (error) {
    if (isRetainerSchemaMissingError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((payment) => ({
    period_year: payment.period_year as number,
    period_month: payment.period_month as number,
    status: payment.status as RetainerPaymentRecord["status"],
    paid_at: (payment.paid_at as string | null) ?? null,
  }));
}

async function fetchClientForCommissionSync(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
) {
  let clientResult = await supabase
    .from("clients")
    .select(
      `
      setup_fee_cents,
      monthly_revenue_cents,
      contract_start_date,
      contract_status,
      commission_status,
      commission_total_cents,
      commission_paid_cents,
      assigned_freelancer_id,
      freelancer_commission_rate,
      freelancer_payout_cents,
      freelancer_paid_cents,
      responsible_member:profiles!clients_responsible_member_id_fkey(commission_rate)
    `,
    )
    .eq("id", clientId)
    .single();

  if (
    clientResult.error &&
    isContractStatusSchemaMissingError(clientResult.error.message)
  ) {
    clientResult = await supabase
      .from("clients")
      .select(
        `
        setup_fee_cents,
        monthly_revenue_cents,
        contract_start_date,
        commission_status,
        commission_total_cents,
        commission_paid_cents,
        responsible_member:profiles!clients_responsible_member_id_fkey(commission_rate)
      `,
      )
      .eq("id", clientId)
      .single();
  }

  if (
    clientResult.error &&
    isCommissionSchemaMissingError(clientResult.error.message)
  ) {
    clientResult = await supabase
      .from("clients")
      .select(
        `
        setup_fee_cents,
        monthly_revenue_cents,
        contract_start_date,
        commission_status,
        responsible_member:profiles!clients_responsible_member_id_fkey(commission_rate)
      `,
      )
      .eq("id", clientId)
      .single();
  }

  if (
    clientResult.error &&
    isRetainerSchemaMissingError(clientResult.error.message)
  ) {
    clientResult = await supabase
      .from("clients")
      .select(
        `
        setup_fee_cents,
        monthly_revenue_cents,
        commission_status,
        commission_total_cents,
        commission_paid_cents,
        responsible_member:profiles!clients_responsible_member_id_fkey(commission_rate)
      `,
      )
      .eq("id", clientId)
      .single();
  }

  return clientResult;
}

export async function purgeRetainerPayments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
) {
  const { error } = await supabase
    .from("client_retainer_payments")
    .delete()
    .eq("client_id", clientId);

  if (error && !isRetainerSchemaMissingError(error.message)) {
    throw new Error(error.message);
  }
}

export async function syncClientTotalRevenue(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
) {
  const clientResult = await fetchClientForCommissionSync(supabase, clientId);
  if (clientResult.error) throw new Error(clientResult.error.message);
  const client = clientResult.data;

  const member = Array.isArray(client.responsible_member)
    ? client.responsible_member[0]
    : client.responsible_member;
  const commissionRate =
    (member as { commission_rate: number } | null)?.commission_rate ?? 0;

  const clientInvoices = (
    await supabase
      .from("invoices")
      .select(
        "billing_period_year, billing_period_month, status, invoice_type",
      )
      .eq("client_id", clientId)
      .neq("status", "cancelled")
  ).data ?? [];

  const retainerInvoices = clientInvoices;
  const isProjectPaid = isClientSetupInvoicePaid(clientInvoices);

  const retainerStats = buildRetainerStats({
    contract_start_date: (client.contract_start_date as string | null) ?? null,
    contract_status: (client.contract_status as string | null) ?? null,
    setup_fee_cents: (client.setup_fee_cents as number | null) ?? null,
    monthly_revenue_cents: (client.monthly_revenue_cents as number | null) ?? null,
    retainerInvoices,
  });

  const paidRetainerStats = summarizePaidRetainerInvoices(
    (
      await supabase
        .from("invoices")
        .select(
          "subtotal_cents, amount_cents, invoice_type, billing_period_year, billing_period_month, status",
        )
        .eq("client_id", clientId)
        .eq("status", "paid")
    ).data ?? [],
  );

  const totalRevenueCents =
    retainerStats.setup_revenue_cents + paidRetainerStats.revenue_cents;

  const setupFeeCents = (client.setup_fee_cents as number | null) ?? 0;
  const hasCommissionSchema = client.commission_total_cents !== undefined;

  const commissionSync = syncCommissionAmounts({
    setupFeeCents: client.setup_fee_cents as number | null,
    commissionRate,
    currentTotalCents: hasCommissionSchema
      ? ((client.commission_total_cents as number) ?? 0)
      : 0,
    currentPaidCents: hasCommissionSchema
      ? ((client.commission_paid_cents as number) ?? 0)
      : 0,
  });

  const hasFreelancerSchema = client.freelancer_payout_cents !== undefined;
  const freelancerCommissionRate = hasFreelancerSchema
    ? Number(client.freelancer_commission_rate ?? 0)
    : 0;
  const freelancerSync = syncFreelancerPayoutAmounts({
    setupFeeCents: client.setup_fee_cents as number | null,
    freelancerCommissionRate:
      (client.assigned_freelancer_id as string | null) && freelancerCommissionRate > 0
        ? freelancerCommissionRate
        : 0,
    isProjectPaid,
    currentTotalCents: hasFreelancerSchema
      ? ((client.freelancer_payout_cents as number) ?? 0)
      : 0,
    currentPaidCents: hasFreelancerSchema
      ? ((client.freelancer_paid_cents as number) ?? 0)
      : 0,
  });

  const updatePayload: Record<string, unknown> = {
    total_revenue_cents: totalRevenueCents > 0 ? totalRevenueCents : null,
    commission_status: commissionSync.commission_status,
  };

  if (hasCommissionSchema) {
    updatePayload.commission_total_cents = commissionSync.commission_total_cents;
    updatePayload.commission_paid_cents = commissionSync.commission_paid_cents;
    updatePayload.commission_outstanding_cents =
      commissionSync.commission_outstanding_cents;
  } else if (setupFeeCents <= 0) {
    updatePayload.commission_status = "none";
  }

  if (hasFreelancerSchema) {
    updatePayload.freelancer_payout_cents = freelancerSync.freelancer_payout_cents;
    updatePayload.freelancer_paid_cents = freelancerSync.freelancer_paid_cents;
    updatePayload.freelancer_outstanding_cents =
      freelancerSync.freelancer_outstanding_cents;
    updatePayload.freelancer_payout_status = freelancerSync.freelancer_payout_status;
  }

  const { error: updateError } = await supabase
    .from("clients")
    .update(updatePayload)
    .eq("id", clientId);

  if (updateError) throw new Error(updateError.message);
}

export async function markRetainerPeriodPaid(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  periodYear: number,
  periodMonth: number,
) {
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("monthly_revenue_cents")
    .eq("id", clientId)
    .single();

  if (clientError) throw new Error(clientError.message);
  if (!hasActiveRetainer(client.monthly_revenue_cents as number | null)) {
    return;
  }

  const { error } = await supabase.from("client_retainer_payments").upsert(
    {
      client_id: clientId,
      period_year: periodYear,
      period_month: periodMonth,
      status: "paid",
      paid_at: new Date().toISOString(),
    },
    { onConflict: "client_id,period_year,period_month" },
  );

  if (error) {
    if (isRetainerSchemaMissingError(error.message)) return;
    throw new Error(error.message);
  }

  await syncClientTotalRevenue(supabase, clientId);
}