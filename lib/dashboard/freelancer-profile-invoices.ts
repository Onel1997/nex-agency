import { canAccessFinanceRoutes } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import {
  FREELANCER_INVOICE_PDFS_BUCKET,
  getOrCreateFreelancerProfile,
  isFreelancerProfileSchemaMissingError,
} from "./freelancer-profiles";
import { generateFreelancerProfileInvoicePdfBuffer } from "./freelancer-profile-invoice-pdf";
import type {
  FreelancerProfileInvoiceRecord,
  FreelancerProfileInvoiceWithDetails,
} from "./types";
import { createClient } from "@/lib/supabase/server";

function mapInvoiceRow(row: Record<string, unknown>): FreelancerProfileInvoiceRecord {
  const client = Array.isArray(row.client)
    ? row.client[0]
    : row.client;

  return {
    id: row.id as string,
    freelancer_profile_id: row.freelancer_profile_id as string,
    client_id: row.client_id as string,
    payout_id: (row.payout_id as string | null) ?? null,
    invoice_number: row.invoice_number as string,
    amount_cents: row.amount_cents as number,
    invoice_date: row.invoice_date as string,
    status: row.status as string,
    pdf_url: (row.pdf_url as string | null) ?? null,
    created_at: row.created_at as string,
    client_name: (client as { company_name: string } | null)?.company_name,
  };
}

export async function getFreelancerProfileInvoicesByProfileId(
  profileId: string,
): Promise<FreelancerProfileInvoiceRecord[]> {
  const actor = await getProfile();
  if (!actor || !canAccessFinanceRoutes(actor)) {
    throw new Error("Keine Berechtigung");
  }

  const billingProfile = await getOrCreateFreelancerProfile(profileId);
  if (!billingProfile.id) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("freelancer_profile_invoices")
    .select("*, client:clients(company_name)")
    .eq("freelancer_profile_id", billingProfile.id)
    .order("created_at", { ascending: false });

  if (error) {
    if (isFreelancerProfileSchemaMissingError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapInvoiceRow(row));
}

export async function getFreelancerProfileInvoiceWithDetails(
  invoiceId: string,
): Promise<FreelancerProfileInvoiceWithDetails | null> {
  const actor = await getProfile();
  if (!actor || !canAccessFinanceRoutes(actor)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("freelancer_profile_invoices")
    .select(
      `
      *,
      client:clients(company_name),
      freelancer_profile:freelancer_profiles(
        *,
        profile:profiles(full_name, email)
      )
    `,
    )
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) {
    if (isFreelancerProfileSchemaMissingError(error.message)) return null;
    throw new Error(error.message);
  }
  if (!data) return null;

  const billingProfileRaw = (Array.isArray(data.freelancer_profile)
    ? data.freelancer_profile[0]
    : data.freelancer_profile) as Record<string, unknown> | null;

  if (!billingProfileRaw) return null;

  const nestedProfile = billingProfileRaw.profile;
  const profileRow = Array.isArray(nestedProfile)
    ? nestedProfile[0]
    : nestedProfile;

  const profileMeta = profileRow as {
    full_name: string | null;
    email: string;
  } | null;

  const billingProfile = billingProfileRaw;

  return {
    ...mapInvoiceRow(data),
    profile: {
      id: billingProfile.id as string,
      profile_id: billingProfile.profile_id as string,
      iban: (billingProfile.iban as string | null) ?? null,
      bic: (billingProfile.bic as string | null) ?? null,
      bank_name: (billingProfile.bank_name as string | null) ?? null,
      street: (billingProfile.street as string | null) ?? null,
      postal_code: (billingProfile.postal_code as string | null) ?? null,
      city: (billingProfile.city as string | null) ?? null,
      country: (billingProfile.country as string | null) ?? "Deutschland",
      tax_number: (billingProfile.tax_number as string | null) ?? null,
      vat_id: (billingProfile.vat_id as string | null) ?? null,
      business_name: (billingProfile.business_name as string | null) ?? null,
      invoice_prefix: String(billingProfile.invoice_prefix ?? "FR"),
      notes: (billingProfile.notes as string | null) ?? null,
      created_at: billingProfile.created_at as string,
      updated_at: billingProfile.updated_at as string,
    },
    freelancer_name:
      profileMeta?.full_name?.trim() ||
      profileMeta?.email?.split("@")[0] ||
      "Freelancer",
    freelancer_email: profileMeta?.email ?? null,
    client_name:
      mapInvoiceRow(data).client_name ??
      (data.client as { company_name: string } | null)?.company_name ??
      "Projekt",
    business_name: (billingProfile.business_name as string | null) ?? null,
  };
}

async function uploadFreelancerInvoicePdf(
  invoiceId: string,
  invoiceNumber: string,
  pdfBuffer: Buffer,
): Promise<string> {
  const supabase = await createClient();
  const storagePath = `${invoiceId}/${invoiceNumber}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(FREELANCER_INVOICE_PDFS_BUCKET)
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    return `/api/freelancer-profile-invoices/${invoiceId}/pdf`;
  }

  return storagePath;
}

export async function generateAndStoreFreelancerProfileInvoicePdf(
  invoiceId: string,
): Promise<string> {
  const invoice = await getFreelancerProfileInvoiceWithDetails(invoiceId);
  if (!invoice) throw new Error("Rechnung nicht gefunden");

  const pdfBuffer = await generateFreelancerProfileInvoicePdfBuffer(invoice);
  const pdfUrl = await uploadFreelancerInvoicePdf(
    invoiceId,
    invoice.invoice_number,
    pdfBuffer,
  );

  const supabase = await createClient();
  const { error } = await supabase
    .from("freelancer_profile_invoices")
    .update({ pdf_url: pdfUrl })
    .eq("id", invoiceId);

  if (error) throw new Error(error.message);
  return pdfUrl;
}

export interface CreateFreelancerProfileInvoiceInput {
  profileId: string;
  clientId: string;
  payoutId: string;
  amountCents: number;
  paidAt: string;
}

export async function createFreelancerProfileInvoiceForPayout(
  input: CreateFreelancerProfileInvoiceInput,
): Promise<FreelancerProfileInvoiceRecord | null> {
  const actor = await getProfile();
  if (!actor || !canAccessFinanceRoutes(actor)) {
    throw new Error("Keine Berechtigung");
  }

  const billingProfile = await getOrCreateFreelancerProfile(input.profileId);
  if (!billingProfile.id) return null;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("freelancer_profile_invoices")
    .select("*")
    .eq("payout_id", input.payoutId)
    .maybeSingle();

  if (existing) {
    return mapInvoiceRow(existing);
  }

  const { data: invoiceNumber, error: numberError } = await supabase.rpc(
    "next_freelancer_profile_invoice_number",
    { p_prefix: billingProfile.invoice_prefix },
  );

  if (numberError) {
    if (isFreelancerProfileSchemaMissingError(numberError.message)) return null;
    throw new Error(numberError.message);
  }

  const invoiceDate = input.paidAt.slice(0, 10);

  const { data: inserted, error: insertError } = await supabase
    .from("freelancer_profile_invoices")
    .insert({
      freelancer_profile_id: billingProfile.id,
      client_id: input.clientId,
      payout_id: input.payoutId,
      invoice_number: invoiceNumber as string,
      amount_cents: input.amountCents,
      invoice_date: invoiceDate,
      status: "paid",
    })
    .select("*, client:clients(company_name)")
    .single();

  if (insertError) {
    if (isFreelancerProfileSchemaMissingError(insertError.message)) return null;
    throw new Error(insertError.message);
  }

  const invoice = mapInvoiceRow(inserted);

  try {
    await generateAndStoreFreelancerProfileInvoicePdf(invoice.id);
  } catch {
    // PDF generation is best-effort; invoice record remains valid
  }

  return invoice;
}
