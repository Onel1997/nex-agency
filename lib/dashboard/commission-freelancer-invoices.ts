import type { SupabaseClient } from "@supabase/supabase-js";
import { canAccessFinanceRoutes } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import type { CommissionEntryType } from "./commission-constants";
import {
  formatGermanMonthYear,
  type CommissionPayoutRole,
} from "./commission-freelancer-invoice-constants";
import { FREELANCER_INVOICE_PDFS_BUCKET } from "./freelancer-profiles";
import { generateCommissionFreelancerInvoicePdfBuffer } from "./commission-freelancer-invoice-pdf";
import type {
  CommissionFreelancerInvoiceRecord,
  CommissionFreelancerInvoiceWithDetails,
  FreelancerProfileRecord,
} from "./types";
import { createClient } from "@/lib/supabase/server";

export function isCommissionFreelancerInvoiceSchemaMissingError(
  message: string,
): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("commission_freelancer_invoices") ||
    normalized.includes("does not exist")
  );
}

function mapInvoiceRow(row: Record<string, unknown>): CommissionFreelancerInvoiceRecord {
  const client = Array.isArray(row.client) ? row.client[0] : row.client;
  const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;

  return {
    id: row.id as string,
    commission_payout_id: row.commission_payout_id as string,
    freelancer_profile_id: (row.freelancer_profile_id as string | null) ?? null,
    profile_id: row.profile_id as string,
    commission_entry_id: row.commission_entry_id as string,
    client_id: row.client_id as string,
    role: row.role as CommissionPayoutRole,
    invoice_number: row.invoice_number as string,
    amount_cents: row.amount_cents as number,
    service_description: row.service_description as string,
    billing_period_year: (row.billing_period_year as number | null) ?? null,
    billing_period_month: (row.billing_period_month as number | null) ?? null,
    invoice_date: row.invoice_date as string,
    status: row.status as CommissionFreelancerInvoiceRecord["status"],
    pdf_url: (row.pdf_url as string | null) ?? null,
    created_at: row.created_at as string,
    client_name: (client as { company_name: string } | null)?.company_name,
    profile_name: (profile as { full_name: string | null; email: string } | null)
      ?.full_name?.trim() ||
      (profile as { email: string } | null)?.email?.split("@")[0],
  };
}

function mapBillingProfileRow(row: Record<string, unknown>): FreelancerProfileRecord {
  return {
    id: row.id as string,
    profile_id: row.profile_id as string,
    iban: (row.iban as string | null) ?? null,
    bic: (row.bic as string | null) ?? null,
    bank_name: (row.bank_name as string | null) ?? null,
    street: (row.street as string | null) ?? null,
    postal_code: (row.postal_code as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    country: (row.country as string | null) ?? "Deutschland",
    tax_number: (row.tax_number as string | null) ?? null,
    vat_id: (row.vat_id as string | null) ?? null,
    business_name: (row.business_name as string | null) ?? null,
    invoice_prefix: String(row.invoice_prefix ?? "FR").trim() || "FR",
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function resolveCommissionPayoutRole(input: {
  profileId: string;
  setterId: string | null;
  closerId: string | null;
}): CommissionPayoutRole | null {
  if (input.setterId === input.profileId) return "setter";
  if (input.closerId === input.profileId) return "closer";
  return null;
}

export function buildCommissionServiceDescription(input: {
  entryType: CommissionEntryType;
  clientName: string;
  billingPeriodYear: number | null;
  billingPeriodMonth: number | null;
  paidAt: string;
}): string {
  if (input.entryType === "retainer") {
    const paidDate = new Date(input.paidAt);
    const month = input.billingPeriodMonth ?? paidDate.getUTCMonth() + 1;
    const year = input.billingPeriodYear ?? paidDate.getUTCFullYear();
    return `Provisionen ${formatGermanMonthYear(month, year)}`;
  }

  const clientLabel = input.clientName.trim() || "Kunde";
  return `Setup-Provision ${clientLabel}`;
}

async function getOrCreateBillingProfileForProfileId(
  supabase: SupabaseClient,
  profileId: string,
): Promise<FreelancerProfileRecord | null> {
  const { data: existing, error: selectError } = await supabase
    .from("freelancer_profiles")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (selectError) {
    if (isCommissionFreelancerInvoiceSchemaMissingError(selectError.message)) {
      return null;
    }
    throw new Error(selectError.message);
  }

  if (existing) {
    return mapBillingProfileRow(existing);
  }

  const { data: inserted, error: insertError } = await supabase
    .from("freelancer_profiles")
    .insert({ profile_id: profileId })
    .select("*")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: retry } = await supabase
        .from("freelancer_profiles")
        .select("*")
        .eq("profile_id", profileId)
        .maybeSingle();
      return retry ? mapBillingProfileRow(retry) : null;
    }
    throw new Error(insertError.message);
  }

  return mapBillingProfileRow(inserted);
}

interface CommissionEntryContext {
  id: string;
  client_id: string;
  setter_id: string | null;
  closer_id: string | null;
  entry_type: CommissionEntryType;
  client_name: string;
  billing_period_year: number | null;
  billing_period_month: number | null;
}

async function fetchCommissionEntryContext(
  supabase: SupabaseClient,
  entryId: string,
): Promise<CommissionEntryContext | null> {
  const { data, error } = await supabase
    .from("commission_entries")
    .select(
      `
      id,
      client_id,
      setter_id,
      closer_id,
      entry_type,
      client:clients!commission_entries_client_id_fkey(company_name),
      invoice:invoices!commission_entries_triggered_by_invoice_id_fkey(
        billing_period_year,
        billing_period_month
      )
    `,
    )
    .eq("id", entryId)
    .maybeSingle();

  if (error) {
    if (isCommissionFreelancerInvoiceSchemaMissingError(error.message)) return null;
    throw new Error(error.message);
  }
  if (!data) return null;

  const client = Array.isArray(data.client) ? data.client[0] : data.client;
  const invoice = Array.isArray(data.invoice) ? data.invoice[0] : data.invoice;

  return {
    id: data.id as string,
    client_id: data.client_id as string,
    setter_id: (data.setter_id as string | null) ?? null,
    closer_id: (data.closer_id as string | null) ?? null,
    entry_type: data.entry_type as CommissionEntryType,
    client_name: (client as { company_name: string } | null)?.company_name ?? "Kunde",
    billing_period_year:
      (invoice as { billing_period_year: number | null } | null)?.billing_period_year ?? null,
    billing_period_month:
      (invoice as { billing_period_month: number | null } | null)?.billing_period_month ?? null,
  };
}

async function uploadCommissionFreelancerInvoicePdf(
  invoiceId: string,
  invoiceNumber: string,
  pdfBuffer: Buffer,
): Promise<string> {
  const supabase = await createClient();
  const storagePath = `commission/${invoiceId}/${invoiceNumber}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(FREELANCER_INVOICE_PDFS_BUCKET)
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    return `/api/commission-freelancer-invoices/${invoiceId}/pdf`;
  }

  return storagePath;
}

export async function getCommissionFreelancerInvoiceWithDetails(
  invoiceId: string,
): Promise<CommissionFreelancerInvoiceWithDetails | null> {
  const actor = await getProfile();
  if (!actor || !canAccessFinanceRoutes(actor)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("commission_freelancer_invoices")
    .select(
      `
      *,
      client:clients(company_name),
      profile:profiles(full_name, email),
      freelancer_profile:freelancer_profiles(*)
    `,
    )
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) {
    if (isCommissionFreelancerInvoiceSchemaMissingError(error.message)) return null;
    throw new Error(error.message);
  }
  if (!data) return null;

  const billingProfileRaw = (Array.isArray(data.freelancer_profile)
    ? data.freelancer_profile[0]
    : data.freelancer_profile) as Record<string, unknown> | null;

  const profileRow = Array.isArray(data.profile) ? data.profile[0] : data.profile;
  const profileMeta = profileRow as {
    full_name: string | null;
    email: string;
  } | null;

  const billingProfile = billingProfileRaw
    ? mapBillingProfileRow(billingProfileRaw)
    : {
        id: "",
        profile_id: data.profile_id as string,
        iban: null,
        bic: null,
        bank_name: null,
        street: null,
        postal_code: null,
        city: null,
        country: "Deutschland",
        tax_number: null,
        vat_id: null,
        business_name: null,
        invoice_prefix: "FR",
        notes: null,
        created_at: data.created_at as string,
        updated_at: data.created_at as string,
      };

  return {
    ...mapInvoiceRow(data),
    profile: billingProfile,
    freelancer_name:
      profileMeta?.full_name?.trim() ||
      profileMeta?.email?.split("@")[0] ||
      "Freelancer",
    freelancer_email: profileMeta?.email ?? null,
    client_name:
      mapInvoiceRow(data).client_name ??
      (data.client as { company_name: string } | null)?.company_name ??
      "Kunde",
    business_name: billingProfile.business_name,
  };
}

export async function generateAndStoreCommissionFreelancerInvoicePdf(
  invoiceId: string,
): Promise<string> {
  const invoice = await getCommissionFreelancerInvoiceWithDetails(invoiceId);
  if (!invoice) throw new Error("Rechnung nicht gefunden");

  const pdfBuffer = await generateCommissionFreelancerInvoicePdfBuffer(invoice);
  const pdfUrl = await uploadCommissionFreelancerInvoicePdf(
    invoiceId,
    invoice.invoice_number,
    pdfBuffer,
  );

  const supabase = await createClient();
  const { error } = await supabase
    .from("commission_freelancer_invoices")
    .update({ pdf_url: pdfUrl })
    .eq("id", invoiceId);

  if (error) throw new Error(error.message);
  return pdfUrl;
}

export interface CreateCommissionFreelancerInvoiceInput {
  commissionPayoutId: string;
  profileId: string;
  commissionEntryId: string;
  amountCents: number;
  paidAt: string;
}

export async function createCommissionFreelancerInvoiceForPayout(
  input: CreateCommissionFreelancerInvoiceInput,
  supabaseClient?: SupabaseClient,
): Promise<CommissionFreelancerInvoiceRecord | null> {
  const supabase = supabaseClient ?? (await createClient());

  const { data: existing } = await supabase
    .from("commission_freelancer_invoices")
    .select("*")
    .eq("commission_payout_id", input.commissionPayoutId)
    .maybeSingle();

  if (existing) {
    return mapInvoiceRow(existing);
  }

  const entry = await fetchCommissionEntryContext(supabase, input.commissionEntryId);
  if (!entry) return null;

  const role = resolveCommissionPayoutRole({
    profileId: input.profileId,
    setterId: entry.setter_id,
    closerId: entry.closer_id,
  });
  if (!role) return null;

  const billingProfile = await getOrCreateBillingProfileForProfileId(
    supabase,
    input.profileId,
  );
  if (!billingProfile?.id) return null;

  const serviceDescription = buildCommissionServiceDescription({
    entryType: entry.entry_type,
    clientName: entry.client_name,
    billingPeriodYear: entry.billing_period_year,
    billingPeriodMonth: entry.billing_period_month,
    paidAt: input.paidAt,
  });

  const { data: invoiceNumber, error: numberError } = await supabase.rpc(
    "next_freelancer_profile_invoice_number",
    { p_prefix: billingProfile.invoice_prefix },
  );

  if (numberError) {
    if (isCommissionFreelancerInvoiceSchemaMissingError(numberError.message)) {
      return null;
    }
    throw new Error(numberError.message);
  }

  const invoiceDate = input.paidAt.slice(0, 10);

  const { data: inserted, error: insertError } = await supabase
    .from("commission_freelancer_invoices")
    .insert({
      commission_payout_id: input.commissionPayoutId,
      freelancer_profile_id: billingProfile.id,
      profile_id: input.profileId,
      commission_entry_id: input.commissionEntryId,
      client_id: entry.client_id,
      role,
      invoice_number: invoiceNumber as string,
      amount_cents: input.amountCents,
      service_description: serviceDescription,
      billing_period_year: entry.billing_period_year,
      billing_period_month: entry.billing_period_month,
      invoice_date: invoiceDate,
      status: "completed",
    })
    .select("*, client:clients(company_name), profile:profiles(full_name, email)")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: retry } = await supabase
        .from("commission_freelancer_invoices")
        .select("*")
        .eq("commission_payout_id", input.commissionPayoutId)
        .maybeSingle();
      return retry ? mapInvoiceRow(retry) : null;
    }
    if (isCommissionFreelancerInvoiceSchemaMissingError(insertError.message)) {
      return null;
    }
    throw new Error(insertError.message);
  }

  const invoice = mapInvoiceRow(inserted);

  try {
    await generateAndStoreCommissionFreelancerInvoicePdf(invoice.id);
  } catch {
    // PDF generation is best-effort; invoice record remains valid
  }

  return invoice;
}

export interface CommissionPayoutInvoiceInput {
  id: string;
  profile_id: string;
  amount_cents: number;
  paid_at: string;
}

export async function createCommissionFreelancerInvoicesForPayouts(input: {
  commissionEntryId: string;
  payouts: CommissionPayoutInvoiceInput[];
}): Promise<CommissionFreelancerInvoiceRecord[]> {
  const supabase = await createClient();
  const created: CommissionFreelancerInvoiceRecord[] = [];

  for (const payout of input.payouts) {
    try {
      const invoice = await createCommissionFreelancerInvoiceForPayout(
        {
          commissionPayoutId: payout.id,
          profileId: payout.profile_id,
          commissionEntryId: input.commissionEntryId,
          amountCents: payout.amount_cents,
          paidAt: payout.paid_at,
        },
        supabase,
      );
      if (invoice) {
        created.push(invoice);
      }
    } catch {
      // Invoice creation must not block payout completion
    }
  }

  return created;
}

export interface BackfillCommissionFreelancerInvoicesResult {
  scanned: number;
  created: number;
  skipped: number;
  errors: Array<{ payoutId: string; message: string }>;
}

interface UninvoicedCommissionPayoutRow {
  id: string;
  profile_id: string;
  amount_cents: number;
  paid_at: string;
  commission_entry_id: string;
}

/**
 * Creates missing commission_freelancer_invoices for existing commission_payouts.
 * Idempotent: skips payouts that already have an invoice (commission_payout_id UNIQUE).
 * PDFs are generated best-effort after each insert.
 */
export async function backfillCommissionFreelancerInvoicesFromPayouts(
  profileId?: string,
): Promise<BackfillCommissionFreelancerInvoicesResult> {
  const actor = await getProfile();
  if (!actor || !canAccessFinanceRoutes(actor)) {
    throw new Error("Keine Berechtigung");
  }

  const supabase = await createClient();
  let query = supabase
    .from("commission_payouts")
    .select("id, profile_id, amount_cents, paid_at, commission_entry_id")
    .order("paid_at", { ascending: true });

  if (profileId) {
    query = query.eq("profile_id", profileId);
  }

  const { data: payouts, error } = await query;
  if (error) {
    if (isCommissionFreelancerInvoiceSchemaMissingError(error.message)) {
      return { scanned: 0, created: 0, skipped: 0, errors: [] };
    }
    throw new Error(error.message);
  }

  const payoutRows = (payouts ?? []) as UninvoicedCommissionPayoutRow[];
  if (payoutRows.length === 0) {
    return { scanned: 0, created: 0, skipped: 0, errors: [] };
  }

  const payoutIds = payoutRows.map((row) => row.id);
  const { data: existingInvoices, error: invoiceError } = await supabase
    .from("commission_freelancer_invoices")
    .select("commission_payout_id")
    .in("commission_payout_id", payoutIds);

  if (invoiceError) {
    if (isCommissionFreelancerInvoiceSchemaMissingError(invoiceError.message)) {
      return { scanned: payoutRows.length, created: 0, skipped: 0, errors: [] };
    }
    throw new Error(invoiceError.message);
  }

  const invoicedPayoutIds = new Set(
    (existingInvoices ?? []).map((row) => row.commission_payout_id as string),
  );

  const result: BackfillCommissionFreelancerInvoicesResult = {
    scanned: payoutRows.length,
    created: 0,
    skipped: 0,
    errors: [],
  };

  for (const payout of payoutRows) {
    if (invoicedPayoutIds.has(payout.id)) {
      result.skipped += 1;
      continue;
    }

    try {
      const invoice = await createCommissionFreelancerInvoiceForPayout(
        {
          commissionPayoutId: payout.id,
          profileId: payout.profile_id,
          commissionEntryId: payout.commission_entry_id,
          amountCents: payout.amount_cents,
          paidAt: payout.paid_at,
        },
        supabase,
      );

      if (invoice) {
        result.created += 1;
        invoicedPayoutIds.add(payout.id);
      } else {
        result.errors.push({
          payoutId: payout.id,
          message:
            "Rechnung konnte nicht erzeugt werden (Eintrag, Rolle oder Billing-Profil fehlt)",
        });
      }
    } catch (err) {
      result.errors.push({
        payoutId: payout.id,
        message: err instanceof Error ? err.message : "Unbekannter Fehler",
      });
    }
  }

  return result;
}

export async function getCommissionFreelancerInvoiceByPayoutId(
  payoutId: string,
): Promise<CommissionFreelancerInvoiceRecord | null> {
  const actor = await getProfile();
  if (!actor || !canAccessFinanceRoutes(actor)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("commission_freelancer_invoices")
    .select("*, client:clients(company_name), profile:profiles(full_name, email)")
    .eq("commission_payout_id", payoutId)
    .maybeSingle();

  if (error) {
    if (isCommissionFreelancerInvoiceSchemaMissingError(error.message)) return null;
    throw new Error(error.message);
  }

  return data ? mapInvoiceRow(data) : null;
}
