import type { SupabaseClient } from "@supabase/supabase-js";
import {
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
import {
  buildRetainerPeriodViews,
  formatRetainerPeriodStatus,
  getNextOpenRetainerPeriod,
} from "./retainer";
import { fetchRetainerInvoices, groupRetainerInvoicesByClient } from "./retainer-data";

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

async function loadClientRetainerInvoices(
  supabase: SupabaseClient,
  clientId: string,
) {
  const invoices = await fetchRetainerInvoices(supabase);
  return groupRetainerInvoicesByClient(invoices).get(clientId) ?? [];
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

  let period: { year: number; month: number };
  if (params.billingPeriodYear != null && params.billingPeriodMonth != null) {
    period = { year: params.billingPeriodYear, month: params.billingPeriodMonth };
  } else {
    const retainerInvoices = await loadClientRetainerInvoices(supabase, params.clientId);
    const periods = buildRetainerPeriodViews(
      client.contract_start_date,
      client.monthly_revenue_cents ?? client.monthly_retainer_cents,
      retainerInvoices,
    );
    const nextOpen = getNextOpenRetainerPeriod(periods);

    if (!nextOpen) {
      throw new Error("Keine offene Retainer-Periode für eine neue Rechnung");
    }

    if (nextOpen.status === "invoice_created") {
      throw new Error(
        `Für ${nextOpen.label} existiert bereits eine Retainer-Rechnung (${formatRetainerPeriodStatus(nextOpen.status)})`,
      );
    }

    if (nextOpen.status !== "open") {
      throw new Error("Keine offene Retainer-Periode für eine neue Rechnung");
    }

    period = { year: nextOpen.period_year, month: nextOpen.period_month };
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
