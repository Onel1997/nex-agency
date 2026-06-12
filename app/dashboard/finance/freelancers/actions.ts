"use server";

import { revalidatePath } from "next/cache";
import { requireFinanceAccess } from "@/lib/auth/session";
import {
  FREELANCER_INVOICE_STATUSES,
  type FreelancerInvoiceStatus,
} from "@/lib/dashboard/constants";
import { parseEuroToCents } from "@/lib/dashboard/format";
import { calculateInvoiceAmounts } from "@/lib/dashboard/invoice-math";
import { computeInvoiceDueDate } from "@/lib/dashboard/invoice-dates";
import { isFreelancerSchemaMissingError } from "@/lib/dashboard/freelancers";
import {
  updateFreelancerProfileRecord,
  type FreelancerProfileInput,
} from "@/lib/dashboard/freelancer-profiles";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function revalidateFreelancerPaths(freelancerId?: string) {
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard/finance/freelancers");
  revalidatePath("/dashboard/finance/payouts");
  if (freelancerId) {
    revalidatePath(`/dashboard/finance/freelancers/${freelancerId}`);
  }
}

function readOptionalString(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function readOptionalNumber(formData: FormData, key: string): number | null {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function updateFreelancerBillingProfile(
  profileId: string,
  formData: FormData,
) {
  await requireFinanceAccess();

  const input: FreelancerProfileInput = {
    iban: readOptionalString(formData, "iban"),
    bic: readOptionalString(formData, "bic"),
    bank_name: readOptionalString(formData, "bank_name"),
    street: readOptionalString(formData, "street"),
    postal_code: readOptionalString(formData, "postal_code"),
    city: readOptionalString(formData, "city"),
    country: readOptionalString(formData, "country"),
    tax_number: readOptionalString(formData, "tax_number"),
    vat_id: readOptionalString(formData, "vat_id"),
    business_name: readOptionalString(formData, "business_name"),
    invoice_prefix: readOptionalString(formData, "invoice_prefix"),
    notes: readOptionalString(formData, "notes"),
  };

  await updateFreelancerProfileRecord(profileId, input);
  revalidateFreelancerPaths(profileId);
}

export async function createFreelancer(formData: FormData) {
  await requireFinanceAccess();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name ist erforderlich");

  const commissionRate = readOptionalNumber(formData, "default_commission_rate") ?? 0;
  if (commissionRate < 0 || commissionRate > 100) {
    throw new Error("Provisionssatz muss zwischen 0 und 100 liegen");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("freelancers")
    .insert({
      name,
      company_name: readOptionalString(formData, "company_name"),
      contact_person: readOptionalString(formData, "contact_person"),
      email: readOptionalString(formData, "email"),
      phone: readOptionalString(formData, "phone"),
      street: readOptionalString(formData, "street"),
      postal_code: readOptionalString(formData, "postal_code"),
      city: readOptionalString(formData, "city"),
      country: readOptionalString(formData, "country") ?? "Deutschland",
      tax_number: readOptionalString(formData, "tax_number"),
      vat_id: readOptionalString(formData, "vat_id"),
      iban: readOptionalString(formData, "iban"),
      bic: readOptionalString(formData, "bic"),
      default_commission_rate: commissionRate,
      is_active: formData.get("is_active") !== "false",
    })
    .select("id")
    .single();

  if (error) {
    if (isFreelancerSchemaMissingError(error.message)) {
      throw new Error(
        "Freelancer-Verwaltung ist erst nach Anwenden der Phase-14-Migration verfügbar.",
      );
    }
    throw new Error(error.message);
  }

  revalidateFreelancerPaths(data.id as string);
  return data.id as string;
}

export async function updateFreelancer(freelancerId: string, formData: FormData) {
  await requireFinanceAccess();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name ist erforderlich");

  const commissionRate = readOptionalNumber(formData, "default_commission_rate") ?? 0;
  if (commissionRate < 0 || commissionRate > 100) {
    throw new Error("Provisionssatz muss zwischen 0 und 100 liegen");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("freelancers")
    .update({
      name,
      company_name: readOptionalString(formData, "company_name"),
      contact_person: readOptionalString(formData, "contact_person"),
      email: readOptionalString(formData, "email"),
      phone: readOptionalString(formData, "phone"),
      street: readOptionalString(formData, "street"),
      postal_code: readOptionalString(formData, "postal_code"),
      city: readOptionalString(formData, "city"),
      country: readOptionalString(formData, "country") ?? "Deutschland",
      tax_number: readOptionalString(formData, "tax_number"),
      vat_id: readOptionalString(formData, "vat_id"),
      iban: readOptionalString(formData, "iban"),
      bic: readOptionalString(formData, "bic"),
      default_commission_rate: commissionRate,
      is_active: formData.get("is_active") !== "false",
    })
    .eq("id", freelancerId);

  if (error) throw new Error(error.message);
  revalidateFreelancerPaths(freelancerId);
}

export async function createFreelancerInvoice(
  freelancerId: string,
  formData: FormData,
) {
  await requireFinanceAccess();
  const profile = await getProfile();

  const description = String(formData.get("description") ?? "").trim();
  if (!description) throw new Error("Leistungsbeschreibung ist erforderlich");

  const subtotalCents = parseEuroToCents(String(formData.get("subtotal") ?? ""));
  if (subtotalCents == null || subtotalCents <= 0) {
    throw new Error("Bitte einen gültigen Nettobetrag eingeben");
  }

  const amounts = calculateInvoiceAmounts(subtotalCents);
  const supabase = await createClient();

  const { data: invoiceNumber, error: numberError } = await supabase.rpc(
    "next_freelancer_invoice_number",
  );
  if (numberError) throw new Error(numberError.message);

  const dueDate = computeInvoiceDueDate(new Date());

  const { error } = await supabase.from("freelancer_invoices").insert({
    freelancer_id: freelancerId,
    invoice_number: invoiceNumber as string,
    description,
    subtotal_cents: amounts.subtotalCents,
    tax_amount_cents: amounts.taxAmountCents,
    total_amount_cents: amounts.totalAmountCents,
    vat_rate: amounts.vatRate,
    status: "draft",
    due_date: dueDate,
    created_by: profile?.id ?? null,
  });

  if (error) throw new Error(error.message);
  revalidateFreelancerPaths(freelancerId);
}

export async function updateFreelancerInvoiceStatus(
  invoiceId: string,
  status: FreelancerInvoiceStatus,
) {
  await requireFinanceAccess();

  if (!FREELANCER_INVOICE_STATUSES.includes(status)) {
    throw new Error("Ungültiger Rechnungsstatus");
  }

  const supabase = await createClient();
  const { data: invoice, error: fetchError } = await supabase
    .from("freelancer_invoices")
    .select("freelancer_id, status")
    .eq("id", invoiceId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const updatePayload: Record<string, unknown> = { status };
  const now = new Date().toISOString();

  if (status === "submitted" && invoice.status === "draft") {
    updatePayload.submitted_at = now;
  }
  if (status === "paid") {
    updatePayload.paid_at = now;
  }

  const { error } = await supabase
    .from("freelancer_invoices")
    .update(updatePayload)
    .eq("id", invoiceId);

  if (error) throw new Error(error.message);
  revalidateFreelancerPaths(invoice.freelancer_id as string);
}

export async function deleteFreelancerInvoice(invoiceId: string) {
  await requireFinanceAccess();

  const supabase = await createClient();
  const { data: invoice, error: fetchError } = await supabase
    .from("freelancer_invoices")
    .select("freelancer_id, status")
    .eq("id", invoiceId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (invoice.status !== "draft") {
    throw new Error("Nur Entwürfe können gelöscht werden");
  }

  const { error } = await supabase
    .from("freelancer_invoices")
    .delete()
    .eq("id", invoiceId);

  if (error) throw new Error(error.message);
  revalidateFreelancerPaths(invoice.freelancer_id as string);
}
