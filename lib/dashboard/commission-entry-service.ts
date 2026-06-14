import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateSetterCloserCommissions,
  isCommissionTriggeringInvoiceType,
  shouldCreateCommissionEntry,
} from "./commission-entries";
import { resolveInvoiceType } from "./invoice-type";
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

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, setter_id, closer_id, company_name")
    .eq("id", invoice.client_id as string)
    .single();

  if (clientError || !client) return { created: false };

  const setterId = (client.setter_id as string | null) ?? null;
  const closerId = (client.closer_id as string | null) ?? null;

  const profileIds = [setterId, closerId].filter(Boolean) as string[];
  if (profileIds.length === 0) return { created: false };

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, setter_commission_rate, closer_commission_rate")
    .in("id", profileIds);

  const setterProfile = profiles?.find((profile) => profile.id === setterId);
  const closerProfile = profiles?.find((profile) => profile.id === closerId);

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
      client_id: client.id,
      setter_id: setterId,
      closer_id: closerId,
      project_value_cents: projectValueCents,
      setter_rate: setterRate,
      closer_rate: closerRate,
      setter_commission_cents: commissions.setter_commission_cents,
      closer_commission_cents: commissions.closer_commission_cents,
      status: "pending",
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
