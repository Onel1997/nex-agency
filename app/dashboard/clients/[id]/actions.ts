"use server";

import { revalidatePath } from "next/cache";
import { canAccessClient, canEditClientRevenue, isManagement } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { logClientActivity } from "@/lib/dashboard/client-activities";
import { CLIENT_FILES_BUCKET } from "@/lib/dashboard/client-files";
import {
  parseClientContractFormData,
  saveClientContractData,
} from "@/lib/dashboard/client-contract-save";
import { markRetainerPeriodPaid } from "@/lib/dashboard/client-revenue-sync";
import { getClientById, getClientDetailById } from "@/lib/dashboard/clients";
import {
  getContractRetainerCents,
  hasActiveContract,
} from "@/lib/dashboard/contract-invoices";
import {
  createRetainerInvoiceForClient,
  createSetupInvoiceForClient,
} from "@/lib/dashboard/invoice-contract-actions";
import {
  COMMUNICATION_TYPES,
  INVOICE_STATUSES,
  type CommunicationType,
  type InvoiceStatus,
} from "@/lib/dashboard/constants";
import { parseEuroToCents } from "@/lib/dashboard/format";
import { resolveRetainerAmountCents } from "@/lib/dashboard/billing-cycle";
import { createInvoiceRecord } from "@/lib/dashboard/invoice-create";
import { calculateInvoiceAmounts } from "@/lib/dashboard/invoice-math";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function revalidateClientHub(clientId: string) {
  revalidatePath(`/dashboard/clients/${clientId}`);
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/finance");
}

function actorName(profile: { full_name: string | null; email: string }) {
  return profile.full_name?.trim() || profile.email.split("@")[0];
}

async function requireClientAccess(clientId: string) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");

  const client = await getClientById(clientId);
  if (!client) throw new Error("Kunde nicht gefunden");

  if (!canAccessClient(profile, client.responsible_member_id)) {
    throw new Error("Keine Berechtigung für diesen Kunden");
  }

  return { profile, client };
}

export async function createClientNote(clientId: string, content: string) {
  const { profile } = await requireClientAccess(clientId);
  const trimmed = content.trim();
  if (!trimmed) throw new Error("Notiz darf nicht leer sein");

  const supabase = await createClient();
  const { error } = await supabase.from("client_notes").insert({
    client_id: clientId,
    author_id: profile.id,
    content: trimmed,
  });

  if (error) throw new Error(error.message);
  revalidateClientHub(clientId);
}

export async function updateClientNote(noteId: string, content: string) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");

  const trimmed = content.trim();
  if (!trimmed) throw new Error("Notiz darf nicht leer sein");

  const supabase = await createClient();
  const { data: note, error: fetchError } = await supabase
    .from("client_notes")
    .select("client_id, author_id")
    .eq("id", noteId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (note.author_id !== profile.id && !isManagement(profile)) {
    throw new Error("Keine Berechtigung zum Bearbeiten dieser Notiz");
  }

  await requireClientAccess(note.client_id as string);

  const { error } = await supabase
    .from("client_notes")
    .update({ content: trimmed, updated_at: new Date().toISOString() })
    .eq("id", noteId);

  if (error) throw new Error(error.message);
  revalidateClientHub(note.client_id as string);
}

export async function deleteClientNote(noteId: string) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");

  const supabase = await createClient();
  const { data: note, error: fetchError } = await supabase
    .from("client_notes")
    .select("client_id, author_id")
    .eq("id", noteId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (note.author_id !== profile.id && !isManagement(profile)) {
    throw new Error("Keine Berechtigung zum Löschen dieser Notiz");
  }

  await requireClientAccess(note.client_id as string);

  const { error } = await supabase.from("client_notes").delete().eq("id", noteId);
  if (error) throw new Error(error.message);
  revalidateClientHub(note.client_id as string);
}

export async function createClientCommunication(
  clientId: string,
  data: { type: CommunicationType; summary: string; occurred_at: string },
) {
  const { profile } = await requireClientAccess(clientId);

  if (!COMMUNICATION_TYPES.includes(data.type)) {
    throw new Error("Ungültiger Kommunikationstyp");
  }

  const summary = data.summary.trim();
  if (!summary) throw new Error("Zusammenfassung darf nicht leer sein");

  const supabase = await createClient();
  const { error } = await supabase.from("client_communications").insert({
    client_id: clientId,
    author_id: profile.id,
    communication_type: data.type,
    summary,
    occurred_at: data.occurred_at || new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
  revalidateClientHub(clientId);
}

export async function deleteClientCommunication(communicationId: string) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");

  const supabase = await createClient();
  const { data: entry, error: fetchError } = await supabase
    .from("client_communications")
    .select("client_id, author_id")
    .eq("id", communicationId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (entry.author_id !== profile.id && !isManagement(profile)) {
    throw new Error("Keine Berechtigung zum Löschen");
  }

  await requireClientAccess(entry.client_id as string);

  const { error } = await supabase
    .from("client_communications")
    .delete()
    .eq("id", communicationId);

  if (error) throw new Error(error.message);
  revalidateClientHub(entry.client_id as string);
}

export async function uploadClientFile(clientId: string, formData: FormData) {
  const { profile, client } = await requireClientAccess(clientId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Bitte eine Datei auswählen");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Datei darf maximal 50 MB groß sein");
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Dateityp nicht erlaubt (PDF, DOCX, XLSX, Bilder)");
  }

  const fileId = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${clientId}/${fileId}/${safeName}`;

  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from(CLIENT_FILES_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { error: insertError } = await supabase.from("client_files").insert({
    client_id: clientId,
    uploaded_by: profile.id,
    file_name: file.name,
    storage_path: storagePath,
    file_size_bytes: file.size,
    mime_type: file.type,
  });

  if (insertError) {
    await supabase.storage.from(CLIENT_FILES_BUCKET).remove([storagePath]);
    throw new Error(insertError.message);
  }

  await logClientActivity({
    clientId,
    actorId: profile.id,
    activityType: "file_uploaded",
    description: `${actorName(profile)} hat „${file.name}" hochgeladen`,
    metadata: { file_name: file.name },
  });

  revalidateClientHub(clientId);
}

export async function deleteClientFile(fileId: string) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");

  const supabase = await createClient();
  const { data: file, error: fetchError } = await supabase
    .from("client_files")
    .select("client_id, uploaded_by, storage_path")
    .eq("id", fileId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (file.uploaded_by !== profile.id && !isManagement(profile)) {
    throw new Error("Keine Berechtigung zum Löschen");
  }

  await requireClientAccess(file.client_id as string);

  await supabase.storage
    .from(CLIENT_FILES_BUCKET)
    .remove([file.storage_path as string]);

  const { error } = await supabase.from("client_files").delete().eq("id", fileId);
  if (error) throw new Error(error.message);
  revalidateClientHub(file.client_id as string);
}

export async function getClientFileSignedUrl(fileId: string) {
  await getProfile();
  const supabase = await createClient();

  const { data: file, error: fetchError } = await supabase
    .from("client_files")
    .select("client_id, storage_path")
    .eq("id", fileId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  await requireClientAccess(file.client_id as string);

  const { data, error } = await supabase.storage
    .from(CLIENT_FILES_BUCKET)
    .createSignedUrl(file.storage_path as string, 120);

  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function updateAutoInvoiceEnabled(clientId: string, enabled: boolean) {
  const { profile } = await requireClientAccess(clientId);
  const client = await getClientDetailById(clientId);
  if (!client) throw new Error("Kunde nicht gefunden");

  if (resolveRetainerAmountCents(client) <= 0) {
    throw new Error("Automatische Rechnungen erfordern einen aktiven Retainer-Vertrag");
  }

  const supabase = await createClient();
  const updatePayload: Record<string, unknown> = {
    auto_invoice_enabled: enabled,
  };

  if (enabled && !client.next_invoice_date) {
    updatePayload.next_invoice_date = new Date().toISOString().slice(0, 10);
  }

  const { error } = await supabase.from("clients").update(updatePayload).eq("id", clientId);
  if (error) throw new Error(error.message);

  await logClientActivity({
    clientId,
    actorId: profile.id,
    activityType: "contract_changed",
    description: `${actorName(profile)} hat automatische Rechnungen ${enabled ? "aktiviert" : "pausiert"}`,
    metadata: { auto_invoice_enabled: enabled },
  });

  revalidateClientHub(clientId);
}

export async function createInvoice(
  clientId: string,
  data: { amount: string; status: InvoiceStatus },
) {
  const { profile } = await requireClientAccess(clientId);

  const client = await getClientDetailById(clientId);
  if (client && hasActiveContract(client)) {
    throw new Error("Rechnungen werden automatisch aus Verträgen erstellt.");
  }

  if (!INVOICE_STATUSES.includes(data.status)) {
    throw new Error("Ungültiger Rechnungsstatus");
  }

  const subtotalCents = parseEuroToCents(data.amount);
  if (subtotalCents == null || subtotalCents < 0) {
    throw new Error("Bitte einen gültigen Nettobetrag eingeben");
  }

  const supabase = await createClient();
  const { invoiceNumber, totalAmountCents } = await createInvoiceRecord(supabase, {
    clientId,
    profileId: profile.id,
    subtotalCents,
    status: data.status,
    description: "Leistung gemäß Vereinbarung",
    invoiceType: "manual",
  });

  await logClientActivity({
    clientId,
    actorId: profile.id,
    activityType: "invoice_created",
    description: `${actorName(profile)} hat Rechnung ${invoiceNumber} erstellt`,
    metadata: { invoice_number: invoiceNumber, amount_cents: totalAmountCents },
  });

  revalidateClientHub(clientId);
}

export async function updateClientContract(clientId: string, formData: FormData) {
  const { profile, client } = await requireClientAccess(clientId);

  if (!canEditClientRevenue(profile, client.responsible_member_id)) {
    throw new Error("Keine Berechtigung zum Bearbeiten von Vertragsdaten");
  }

  const input = parseClientContractFormData(formData);
  const supabase = await createClient();

  const { setupInvoice } = await saveClientContractData(
    supabase,
    clientId,
    input,
    profile.id,
  );

  await logClientActivity({
    clientId,
    actorId: profile.id,
    activityType: "contract_changed",
    description: `${actorName(profile)} hat Vertragsdaten geändert`,
  });

  if (setupInvoice) {
    await logClientActivity({
      clientId,
      actorId: profile.id,
      activityType: "invoice_created",
      description: `${actorName(profile)} hat Setup-Rechnung ${setupInvoice.invoiceNumber} beim Speichern des Vertrags erstellt`,
      metadata: {
        invoice_number: setupInvoice.invoiceNumber,
        source: "contract_save",
      },
    });
  }

  revalidateClientHub(clientId);
}

export async function createSetupInvoice(clientId: string) {
  const { profile } = await requireClientAccess(clientId);
  const supabase = await createClient();

  const result = await createSetupInvoiceForClient(supabase, {
    clientId,
    profileId: profile.id,
  });

  if (!result) {
    throw new Error("Setup-Rechnung konnte nicht erstellt werden");
  }

  await logClientActivity({
    clientId,
    actorId: profile.id,
    activityType: "invoice_created",
    description: `${actorName(profile)} hat Setup-Rechnung ${result.invoiceNumber} erstellt`,
    metadata: {
      invoice_number: result.invoiceNumber,
      source: "setup",
    },
  });

  revalidateClientHub(clientId);
  return { invoiceNumber: result.invoiceNumber };
}

export async function createRetainerInvoice(
  clientId: string,
  billingPeriod?: { year: number; month: number },
) {
  const { profile } = await requireClientAccess(clientId);
  const supabase = await createClient();

  const result = await createRetainerInvoiceForClient(supabase, {
    clientId,
    profileId: profile.id,
    billingPeriodYear: billingPeriod?.year,
    billingPeriodMonth: billingPeriod?.month,
  });

  await logClientActivity({
    clientId,
    actorId: profile.id,
    activityType: "invoice_created",
    description: `${actorName(profile)} hat Retainer-Rechnung ${result.invoiceNumber} erstellt`,
    metadata: {
      invoice_number: result.invoiceNumber,
      source: "retainer",
    },
  });

  revalidateClientHub(clientId);
  return { invoiceNumber: result.invoiceNumber };
}

/** @deprecated Use createSetupInvoice */
export async function createInvoiceFromContract(clientId: string) {
  return createSetupInvoice(clientId);
}

async function applyInvoicePaidSideEffects(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoiceId: string,
  clientId: string,
) {
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      "invoice_type, billing_period_year, billing_period_month, subtotal_cents",
    )
    .eq("id", invoiceId)
    .single();

  if (error || !invoice) return;

  const invoiceType =
    (invoice.invoice_type as import("@/lib/dashboard/constants").InvoiceType | null) ??
    (invoice.billing_period_year != null && invoice.billing_period_month != null
      ? "retainer"
      : null);

  if (
    invoiceType === "retainer" &&
    invoice.billing_period_year != null &&
    invoice.billing_period_month != null
  ) {
    await markRetainerPeriodPaid(
      supabase,
      clientId,
      invoice.billing_period_year as number,
      invoice.billing_period_month as number,
    );
    return;
  }

  if (invoiceType === "setup") {
    const { syncClientTotalRevenue } = await import(
      "@/lib/dashboard/client-revenue-sync"
    );
    await syncClientTotalRevenue(supabase, clientId);
  }
}

export async function updateInvoice(
  invoiceId: string,
  data: { amount: string; status: InvoiceStatus },
) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");

  if (!INVOICE_STATUSES.includes(data.status)) {
    throw new Error("Ungültiger Rechnungsstatus");
  }

  const subtotalCents = parseEuroToCents(data.amount);
  if (subtotalCents == null || subtotalCents < 0) {
    throw new Error("Bitte einen gültigen Nettobetrag eingeben");
  }

  const amounts = calculateInvoiceAmounts(subtotalCents);
  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("invoices")
    .select("client_id, status, invoice_number")
    .eq("id", invoiceId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  await requireClientAccess(existing.client_id as string);

  const updatePayload: Record<string, unknown> = {
    amount_cents: amounts.totalAmountCents,
    status: data.status,
    updated_at: new Date().toISOString(),
    subtotal_cents: amounts.subtotalCents,
    tax_amount_cents: amounts.taxAmountCents,
    total_amount_cents: amounts.totalAmountCents,
    vat_rate: amounts.vatRate,
  };

  const { error } = await supabase
    .from("invoices")
    .update(updatePayload)
    .eq("id", invoiceId);

  if (error) throw new Error(error.message);

  await supabase
    .from("invoice_items")
    .update({
      unit_price_cents: amounts.subtotalCents,
      line_total_cents: amounts.subtotalCents,
    })
    .eq("invoice_id", invoiceId);

  const invoiceNumber = existing.invoice_number as string;

  if (existing.status !== "paid" && data.status === "paid") {
    await applyInvoicePaidSideEffects(
      supabase,
      invoiceId,
      existing.client_id as string,
    );
    await logClientActivity({
      clientId: existing.client_id as string,
      actorId: profile.id,
      activityType: "invoice_paid",
      description: `${actorName(profile)} hat Rechnung ${invoiceNumber} als bezahlt markiert`,
      metadata: { invoice_number: invoiceNumber },
    });
  }

  revalidateClientHub(existing.client_id as string);
}

export async function markInvoiceAsSent(invoiceId: string) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("invoices")
    .select("client_id, status, invoice_number")
    .eq("id", invoiceId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  await requireClientAccess(existing.client_id as string);

  if (existing.status === "paid") {
    throw new Error("Bezahlte Rechnungen können nicht als gesendet markiert werden");
  }
  if (existing.status === "cancelled") {
    throw new Error("Stornierte Rechnungen können nicht als gesendet markiert werden");
  }
  if (existing.status === "sent") return;

  const { error } = await supabase
    .from("invoices")
    .update({ status: "sent", updated_at: new Date().toISOString() })
    .eq("id", invoiceId);

  if (error) throw new Error(error.message);

  const invoiceNumber = existing.invoice_number as string;
  await logClientActivity({
    clientId: existing.client_id as string,
    actorId: profile.id,
    activityType: "invoice_sent",
    description: `${actorName(profile)} hat Rechnung ${invoiceNumber} als gesendet markiert`,
    metadata: { invoice_number: invoiceNumber },
  });

  revalidateClientHub(existing.client_id as string);
}

export async function markInvoiceAsPaid(invoiceId: string) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("invoices")
    .select("client_id, status, invoice_number")
    .eq("id", invoiceId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  await requireClientAccess(existing.client_id as string);

  if (existing.status === "paid") return;
  if (existing.status === "cancelled") {
    throw new Error("Stornierte Rechnungen können nicht als bezahlt markiert werden");
  }

  const { error } = await supabase
    .from("invoices")
    .update({ status: "paid", updated_at: new Date().toISOString() })
    .eq("id", invoiceId);

  if (error) throw new Error(error.message);

  await applyInvoicePaidSideEffects(
    supabase,
    invoiceId,
    existing.client_id as string,
  );

  const invoiceNumber = existing.invoice_number as string;
  await logClientActivity({
    clientId: existing.client_id as string,
    actorId: profile.id,
    activityType: "invoice_paid",
    description: `${actorName(profile)} hat Rechnung ${invoiceNumber} als bezahlt markiert`,
    metadata: { invoice_number: invoiceNumber },
  });

  revalidateClientHub(existing.client_id as string);
}

export async function deleteInvoice(invoiceId: string) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");
  if (!isManagement(profile)) {
    throw new Error("Nur Admins können Rechnungen löschen");
  }

  const supabase = await createClient();
  const { data: invoice, error: fetchError } = await supabase
    .from("invoices")
    .select("client_id")
    .eq("id", invoiceId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  await requireClientAccess(invoice.client_id as string);

  const { error } = await supabase.from("invoices").delete().eq("id", invoiceId);
  if (error) throw new Error(error.message);
  revalidateClientHub(invoice.client_id as string);
}
