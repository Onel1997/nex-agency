import { canAccessFinanceRoutes } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import type { FreelancerProfileRecord } from "./types";
import { createClient } from "@/lib/supabase/server";

export const FREELANCER_INVOICE_PDFS_BUCKET = "freelancer-invoice-pdfs";

export function isFreelancerProfileSchemaMissingError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("does not exist") &&
    (normalized.includes("freelancer_profiles") ||
      normalized.includes("freelancer_profile_invoices") ||
      normalized.includes("next_freelancer_profile_invoice_number"))
  );
}

function mapProfileRow(row: Record<string, unknown>): FreelancerProfileRecord {
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

function emptyBillingProfile(profileId: string): FreelancerProfileRecord {
  const now = new Date().toISOString();
  return {
    id: "",
    profile_id: profileId,
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
    created_at: now,
    updated_at: now,
  };
}

export async function getFreelancerProfileByProfileId(
  profileId: string,
): Promise<FreelancerProfileRecord | null> {
  const actor = await getProfile();
  if (!actor || !canAccessFinanceRoutes(actor)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("freelancer_profiles")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    if (isFreelancerProfileSchemaMissingError(error.message)) return null;
    throw new Error(error.message);
  }

  return data ? mapProfileRow(data) : null;
}

function isFreelancerProfileDuplicateError(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "23505" ||
    message.includes("freelancer_profiles_profile_id_key") ||
    message.includes("duplicate key")
  );
}

export async function getOrCreateFreelancerProfile(
  profileId: string,
): Promise<FreelancerProfileRecord> {
  const actor = await getProfile();
  if (!actor || !canAccessFinanceRoutes(actor)) {
    throw new Error("Keine Berechtigung");
  }

  const supabase = await createClient();
  const { data: existing, error: selectError } = await supabase
    .from("freelancer_profiles")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (selectError) {
    if (isFreelancerProfileSchemaMissingError(selectError.message)) {
      return emptyBillingProfile(profileId);
    }
    throw new Error(selectError.message);
  }

  if (existing) {
    return mapProfileRow(existing);
  }

  const { data: inserted, error: insertError } = await supabase
    .from("freelancer_profiles")
    .insert({ profile_id: profileId })
    .select("*")
    .single();

  if (!insertError && inserted) {
    return mapProfileRow(inserted);
  }

  if (insertError) {
    if (isFreelancerProfileSchemaMissingError(insertError.message)) {
      return emptyBillingProfile(profileId);
    }

    if (isFreelancerProfileDuplicateError(insertError)) {
      const { data: raced, error: raceSelectError } = await supabase
        .from("freelancer_profiles")
        .select("*")
        .eq("profile_id", profileId)
        .single();

      if (raceSelectError) {
        throw new Error(raceSelectError.message);
      }

      return mapProfileRow(raced);
    }

    throw new Error(insertError.message);
  }

  throw new Error("Freelancer-Profil konnte nicht geladen werden");
}

export interface FreelancerProfileInput {
  iban?: string | null;
  bic?: string | null;
  bank_name?: string | null;
  street?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  tax_number?: string | null;
  vat_id?: string | null;
  business_name?: string | null;
  invoice_prefix?: string | null;
  notes?: string | null;
}

export async function updateFreelancerProfileRecord(
  profileId: string,
  input: FreelancerProfileInput,
): Promise<FreelancerProfileRecord> {
  const actor = await getProfile();
  if (!actor || !canAccessFinanceRoutes(actor)) {
    throw new Error("Keine Berechtigung");
  }

  await getOrCreateFreelancerProfile(profileId);

  const invoicePrefix = input.invoice_prefix?.trim() || "FR";
  if (!invoicePrefix) {
    throw new Error("Rechnungspräfix ist erforderlich");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("freelancer_profiles")
    .update({
      iban: input.iban?.trim() || null,
      bic: input.bic?.trim() || null,
      bank_name: input.bank_name?.trim() || null,
      street: input.street?.trim() || null,
      postal_code: input.postal_code?.trim() || null,
      city: input.city?.trim() || null,
      country: input.country?.trim() || "Deutschland",
      tax_number: input.tax_number?.trim() || null,
      vat_id: input.vat_id?.trim() || null,
      business_name: input.business_name?.trim() || null,
      invoice_prefix: invoicePrefix.toUpperCase(),
      notes: input.notes?.trim() || null,
    })
    .eq("profile_id", profileId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapProfileRow(data);
}
