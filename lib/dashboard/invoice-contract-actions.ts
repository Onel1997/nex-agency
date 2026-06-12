import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getBillingPeriodForDate,
  formatBillingPeriodLabel,
  resolveRetainerAmountCents,
} from "./billing-cycle";
import {
  getContractRetainerCents,
  getSetupFeeCents,
  hasActiveContract,
  hasRetainerContract,
  hasSetupFee,
} from "./contract-invoices";
import { createInvoiceRecord } from "./invoice-create";
import { getClientDetailById } from "./clients";
import { hasRetainerInvoiceForPeriod } from "./recurring-invoices";
import { getClientPayments } from "./client-revenue-sync";
import { buildRetainerPeriodViews } from "./retainer";

export interface CreateSetupInvoiceResult {
  invoiceNumber: string;
  invoiceId: string;
}

export async function hasSetupInvoiceForClient(
  supabase: SupabaseClient,
  clientId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("invoice_type", "setup")
    .neq("status", "cancelled");

  if (error) {
    if (error.message.includes("invoice_type")) return false;
    throw new Error(error.message);
  }

  return (count ?? 0) > 0;
}

export async function createSetupInvoiceForClient(
  supabase: SupabaseClient,
  params: { clientId: string; profileId: string },
): Promise<CreateSetupInvoiceResult | null> {
  const client = await getClientDetailById(params.clientId);
  if (!client) throw new Error("Kunde nicht gefunden");

  if (!hasSetupFee(client)) {
    throw new Error("Keine Setup-Gebühr im Vertrag hinterlegt");
  }

  const setupCents = getSetupFeeCents(client)!;
  const duplicate = await hasSetupInvoiceForClient(supabase, params.clientId);
  if (duplicate) {
    throw new Error("Es existiert bereits eine Setup-Rechnung für diesen Kunden");
  }

  const { invoiceNumber, invoiceId } = await createInvoiceRecord(supabase, {
    clientId: params.clientId,
    contractId: hasActiveContract(client) ? params.clientId : null,
    profileId: params.profileId,
    subtotalCents: setupCents,
    status: "draft",
    description: `Setup-Gebühr — ${client.company_name}`,
    invoiceType: "setup",
  });

  return { invoiceNumber, invoiceId };
}

export async function createRetainerInvoiceForClient(
  supabase: SupabaseClient,
  params: {
    clientId: string;
    profileId: string;
    billingPeriodYear?: number;
    billingPeriodMonth?: number;
  },
): Promise<CreateSetupInvoiceResult> {
  const client = await getClientDetailById(params.clientId);
  if (!client) throw new Error("Kunde nicht gefunden");

  if (!hasRetainerContract(client)) {
    throw new Error("Kein aktiver Retainer-Vertrag für diesen Kunden");
  }

  const retainerCents = getContractRetainerCents(client);
  const referenceDate = new Date();

  let period: { year: number; month: number };
  if (params.billingPeriodYear != null && params.billingPeriodMonth != null) {
    period = { year: params.billingPeriodYear, month: params.billingPeriodMonth };
  } else {
    const payments = await getClientPayments(supabase, params.clientId);
    const periods = buildRetainerPeriodViews(
      client.contract_start_date,
      client.monthly_revenue_cents ?? client.monthly_retainer_cents,
      payments,
    );
    const nextOpen = resolveNextOpenRetainerPeriod(client, periods);
    period = nextOpen ?? getBillingPeriodForDate(referenceDate, client.billing_cycle);
  }

  const duplicate = await hasRetainerInvoiceForPeriod(supabase, params.clientId, period);
  if (duplicate) {
    throw new Error(
      `Für ${formatBillingPeriodLabel(period, client.billing_cycle)} existiert bereits eine Retainer-Rechnung`,
    );
  }

  const periodLabel = formatBillingPeriodLabel(period, client.billing_cycle);
  const { invoiceNumber, invoiceId } = await createInvoiceRecord(supabase, {
    clientId: params.clientId,
    contractId: params.clientId,
    profileId: params.profileId,
    subtotalCents: retainerCents,
    status: "draft",
    description: `Retainer-Leistung — ${client.company_name} (${periodLabel})`,
    invoiceType: "retainer",
    billingPeriodYear: period.year,
    billingPeriodMonth: period.month,
  });

  return { invoiceNumber, invoiceId };
}

export function resolveNextOpenRetainerPeriod(
  client: {
    contract_start_date: string | null;
    monthly_revenue_cents: number | null;
    monthly_retainer_cents: number | null;
    billing_cycle: import("./constants").BillingCycle;
  },
  retainerPeriods: Array<{
    period_year: number;
    period_month: number;
    status: "paid" | "open";
    isUpcoming?: boolean;
  }>,
): { year: number; month: number } | null {
  if (!client.contract_start_date || resolveRetainerAmountCents(client) <= 0) {
    return null;
  }

  const openPeriod = retainerPeriods.find(
    (period) => period.status === "open" && !period.isUpcoming,
  );
  if (openPeriod) {
    return { year: openPeriod.period_year, month: openPeriod.period_month };
  }

  return getBillingPeriodForDate(new Date(), client.billing_cycle);
}
