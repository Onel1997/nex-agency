import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateSetterCloserCommissions,
  isCommissionTriggeringInvoiceType,
  resolveRetainerCommissionMonthsLimit,
  shouldCreateCommissionEntry,
  shouldCreateRetainerCommissionEntry,
} from "./commission-entries";
import { resolveLeadSetterIdForPersistence } from "./lead-attribution";
import { resolveSalesAttributionIds } from "./sales-attribution";
import { traceSetterId } from "./setter-id-trace";
import { resolveInvoiceType } from "./invoice-type";
import {
  DEFAULT_RETAINER_COMMISSION_RATE,
} from "./commission-constants";
import type { InvoiceRecord } from "./types";

export function isCommissionCenterSchemaMissingError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("commission_entries") ||
    normalized.includes("commission_payouts")
  );
}

function resolveProjectValueCents(invoice: {
  subtotal_cents?: number | null;
  amount_cents?: number | null;
}): number {
  return (
    (invoice.subtotal_cents as number | null) ??
    (invoice.amount_cents as number | null) ??
    0
  );
}

interface ResolvedCommissionAttribution {
  clientId: string;
  companyName: string;
  setterId: string | null;
  closerId: string | null;
  rawSetterId: string | null;
  setterProfile: {
    setter_commission_rate?: number | null;
    closer_commission_rate?: number | null;
    retainer_commission_rate?: number | null;
    retainer_commission_months?: number | null;
    agency_role?: string | null;
  } | undefined;
  closerProfile: {
    setter_commission_rate?: number | null;
    closer_commission_rate?: number | null;
    retainer_commission_rate?: number | null;
    retainer_commission_months?: number | null;
    agency_role?: string | null;
  } | undefined;
}

async function resolveCommissionAttributionFromInvoice(
  supabase: SupabaseClient,
  invoice: {
    client_id: string;
  },
): Promise<ResolvedCommissionAttribution | null> {
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select(
      "id, setter_id, closer_id, company_name, lead:leads!clients_lead_id_fkey(owner_id, created_by, setter_id)",
    )
    .eq("id", invoice.client_id as string)
    .single();

  if (clientError || !client) return null;

  const lead = Array.isArray(client.lead) ? client.lead[0] : client.lead;
  const leadOwnerId = (lead as { owner_id?: string | null } | null)?.owner_id ?? null;
  const rawCloserId = (client.closer_id as string | null) ?? null;
  const rawSetterId = await resolveLeadSetterIdForPersistence(supabase, {
    setter_id: (client.setter_id as string | null) ?? null,
    created_by: (lead as { created_by?: string | null } | null)?.created_by ?? null,
    owner_id: leadOwnerId,
  });

  const initialProfileIds = [rawSetterId, rawCloserId].filter(Boolean) as string[];
  if (initialProfileIds.length === 0) return null;

  const { data: initialProfiles } = await supabase
    .from("profiles")
    .select(
      "id, setter_commission_rate, closer_commission_rate, retainer_commission_rate, retainer_commission_months, agency_role",
    )
    .in("id", initialProfileIds);

  const closerProfile = initialProfiles?.find((profile) => profile.id === rawCloserId);
  const resolvedIds = resolveSalesAttributionIds({
    setterId: rawSetterId,
    closerId: rawCloserId,
    leadOwnerId,
    closerAgencyRole: closerProfile?.agency_role as string | null,
  });

  const setterId = resolvedIds.setterId;
  const closerId = resolvedIds.closerId;
  const resolvedProfileIds = [...new Set([setterId, closerId].filter(Boolean))] as string[];

  if (resolvedProfileIds.length === 0) return null;

  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      "id, setter_commission_rate, closer_commission_rate, retainer_commission_rate, retainer_commission_months, agency_role",
    )
    .in("id", resolvedProfileIds);

  return {
    clientId: client.id as string,
    companyName: client.company_name as string,
    setterId,
    closerId,
    rawSetterId,
    setterProfile: profiles?.find((profile) => profile.id === setterId),
    closerProfile: profiles?.find((profile) => profile.id === closerId),
  };
}

export async function createCommissionEntryFromPaidInvoice(
  supabase: SupabaseClient,
  invoiceId: string,
): Promise<{ created: boolean; entryId?: string }> {
  const { data: existing } = await supabase
    .from("commission_entries")
    .select("id")
    .eq("triggered_by_invoice_id", invoiceId)
    .maybeSingle();

  if (existing) return { created: false };

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select(
      "id, client_id, status, invoice_type, billing_period_year, billing_period_month, subtotal_cents, amount_cents, contract_id",
    )
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoice || invoice.status !== "paid") {
    return { created: false };
  }

  const invoiceType = resolveInvoiceType(invoice as InvoiceRecord);
  if (!isCommissionTriggeringInvoiceType(invoiceType)) {
    return { created: false };
  }

  const attribution = await resolveCommissionAttributionFromInvoice(supabase, invoice);
  if (!attribution) return { created: false };

  const { setterId, closerId, setterProfile, closerProfile } = attribution;
  const setterRate = Number(setterProfile?.setter_commission_rate ?? 0);
  const closerRate = Number(closerProfile?.closer_commission_rate ?? 0);
  const projectValueCents = resolveProjectValueCents(invoice);

  const commissions = calculateSetterCloserCommissions({
    projectValueCents,
    setterRate,
    closerRate,
    hasSetter: Boolean(setterId),
    hasCloser: Boolean(closerId),
  });

  if (
    !shouldCreateCommissionEntry({
      invoiceStatus: "paid",
      invoiceType,
      existingEntryForInvoice: false,
      setterId,
      closerId,
      setterCommissionCents: commissions.setter_commission_cents,
      closerCommissionCents: commissions.closer_commission_cents,
    })
  ) {
    return { created: false };
  }

  const { data: entry, error: insertError } = await supabase
    .from("commission_entries")
    .insert({
      client_id: attribution.clientId,
      setter_id: setterId,
      closer_id: closerId,
      project_value_cents: projectValueCents,
      setter_rate: setterRate,
      closer_rate: closerRate,
      setter_commission_cents: commissions.setter_commission_cents,
      closer_commission_cents: commissions.closer_commission_cents,
      status: "pending",
      entry_type: "setup",
      triggered_by_invoice_id: invoiceId,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") return { created: false };
    throw new Error(insertError.message);
  }

  traceSetterId("9_commission_entry", {
    clientId: attribution.clientId,
    companyName: attribution.companyName,
    clientSetterId: attribution.rawSetterId,
    commissionEntrySetterId: setterId,
    closerId,
    resolvedSetterId: attribution.rawSetterId,
    source: "createCommissionEntryFromPaidInvoice",
    note: "commission_entries.setter_id snapshot at invoice-paid time",
  });

  return { created: true, entryId: entry.id as string };
}

export async function createRetainerCommissionEntryFromPaidInvoice(
  supabase: SupabaseClient,
  invoiceId: string,
): Promise<{ created: boolean; entryId?: string }> {
  const { data: existing } = await supabase
    .from("commission_entries")
    .select("id")
    .eq("triggered_by_invoice_id", invoiceId)
    .maybeSingle();

  if (existing) return { created: false };

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select(
      "id, client_id, status, invoice_type, billing_period_year, billing_period_month, subtotal_cents, amount_cents",
    )
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoice || invoice.status !== "paid") {
    return { created: false };
  }

  const invoiceType = resolveInvoiceType(invoice as InvoiceRecord);
  if (invoiceType !== "retainer") {
    return { created: false };
  }

  const attribution = await resolveCommissionAttributionFromInvoice(supabase, invoice);
  if (!attribution) return { created: false };

  const { clientId, setterId, closerId, setterProfile, closerProfile } = attribution;

  const { count: retainerEntryCount, error: countError } = await supabase
    .from("commission_entries")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("entry_type", "retainer")
    .neq("status", "cancelled");

  if (countError) throw new Error(countError.message);

  const allowedRetainerMonths = resolveRetainerCommissionMonthsLimit({
    setterMonths: setterProfile?.retainer_commission_months,
    closerMonths: closerProfile?.retainer_commission_months,
  });

  const setterRate = Number(
    setterProfile?.retainer_commission_rate ?? DEFAULT_RETAINER_COMMISSION_RATE,
  );
  const closerRate = Number(
    closerProfile?.retainer_commission_rate ?? DEFAULT_RETAINER_COMMISSION_RATE,
  );
  const retainerValueCents = resolveProjectValueCents(invoice);

  const commissions = calculateSetterCloserCommissions({
    projectValueCents: retainerValueCents,
    setterRate,
    closerRate,
    hasSetter: Boolean(setterId),
    hasCloser: Boolean(closerId),
  });

  if (
    !shouldCreateRetainerCommissionEntry({
      invoiceStatus: "paid",
      invoiceType,
      existingEntryForInvoice: false,
      existingRetainerEntryCount: retainerEntryCount ?? 0,
      allowedRetainerMonths,
      setterId,
      closerId,
      setterCommissionCents: commissions.setter_commission_cents,
      closerCommissionCents: commissions.closer_commission_cents,
    })
  ) {
    return { created: false };
  }

  const { data: entry, error: insertError } = await supabase
    .from("commission_entries")
    .insert({
      client_id: clientId,
      setter_id: setterId,
      closer_id: closerId,
      project_value_cents: retainerValueCents,
      setter_rate: setterRate,
      closer_rate: closerRate,
      setter_commission_cents: commissions.setter_commission_cents,
      closer_commission_cents: commissions.closer_commission_cents,
      status: "pending",
      entry_type: "retainer",
      triggered_by_invoice_id: invoiceId,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") return { created: false };
    throw new Error(insertError.message);
  }

  return { created: true, entryId: entry.id as string };
}
