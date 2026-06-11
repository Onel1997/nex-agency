"use server";

import { revalidatePath } from "next/cache";
import { canAccessClient, isManagement } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { logClientActivity } from "@/lib/dashboard/client-activities";
import { CLIENT_FILES_BUCKET } from "@/lib/dashboard/client-files";
import { getClientById } from "@/lib/dashboard/clients";
import {
  COMMUNICATION_TYPES,
  INVOICE_STATUSES,
  type CommunicationType,
  type InvoiceStatus,
} from "@/lib/dashboard/constants";
import { parseEuroToCents } from "@/lib/dashboard/format";
import { generateInvoiceNumber } from "@/lib/dashboard/invoices";
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

export async function createInvoice(
  clientId: string,
  data: { amount: string; status: InvoiceStatus; invoice_number?: string },
) {
  const { profile } = await requireClientAccess(clientId);

  if (!INVOICE_STATUSES.includes(data.status)) {
    throw new Error("Ungültiger Rechnungsstatus");
  }

  const amountCents = parseEuroToCents(data.amount);
  if (amountCents == null || amountCents < 0) {
    throw new Error("Bitte einen gültigen Betrag eingeben");
  }

  const invoiceNumber =
    data.invoice_number?.trim() || (await generateInvoiceNumber());

  const supabase = await createClient();
  const { error } = await supabase.from("invoices").insert({
    client_id: clientId,
    invoice_number: invoiceNumber,
    amount_cents: amountCents,
    status: data.status,
    created_by: profile.id,
  });

  if (error) throw new Error(error.message);

  await logClientActivity({
    clientId,
    actorId: profile.id,
    activityType: "invoice_created",
    description: `${actorName(profile)} hat Rechnung ${invoiceNumber} erstellt`,
    metadata: { invoice_number: invoiceNumber, amount_cents: amountCents },
  });

  revalidateClientHub(clientId);
}

export async function updateInvoice(
  invoiceId: string,
  data: { amount: string; status: InvoiceStatus; invoice_number: string },
) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");

  if (!INVOICE_STATUSES.includes(data.status)) {
    throw new Error("Ungültiger Rechnungsstatus");
  }

  const amountCents = parseEuroToCents(data.amount);
  if (amountCents == null || amountCents < 0) {
    throw new Error("Bitte einen gültigen Betrag eingeben");
  }

  const invoiceNumber = data.invoice_number.trim();
  if (!invoiceNumber) throw new Error("Rechnungsnummer erforderlich");

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("invoices")
    .select("client_id, status")
    .eq("id", invoiceId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  await requireClientAccess(existing.client_id as string);

  const { error } = await supabase
    .from("invoices")
    .update({
      invoice_number: invoiceNumber,
      amount_cents: amountCents,
      status: data.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  if (error) throw new Error(error.message);

  if (existing.status !== "paid" && data.status === "paid") {
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
