"use server";

import { revalidatePath } from "next/cache";
import {
  canManageKnowledgeCenter,
} from "@/lib/auth/permissions";
import { requireKnowledgeCenterAccess } from "@/lib/auth/session";
import type { KnowledgeDocumentVisibility } from "@/lib/dashboard/knowledge-access";
import {
  getKnowledgeDocumentById,
  KNOWLEDGE_ALLOWED_MIME_TYPES,
  KNOWLEDGE_CENTER_BUCKET,
  KNOWLEDGE_MAX_FILE_SIZE,
  slugifyCategoryName,
} from "@/lib/dashboard/knowledge-center";
import { createClient } from "@/lib/supabase/server";

const KNOWLEDGE_PATH = "/dashboard/knowledge";

function revalidateKnowledgeCenter() {
  revalidatePath(KNOWLEDGE_PATH);
}

async function requireKnowledgeManagement() {
  const profile = await requireKnowledgeCenterAccess();
  if (!canManageKnowledgeCenter(profile)) {
    throw new Error("Keine Berechtigung zur Verwaltung des Knowledge Centers");
  }
  return profile;
}

function parseVisibility(value: FormDataEntryValue | null): KnowledgeDocumentVisibility {
  const visibility = String(value ?? "all");
  const allowed: KnowledgeDocumentVisibility[] = [
    "all",
    "owner_admin",
    "sales",
    "setter",
    "closer",
    "project_manager",
    "customer_success",
  ];
  if (!allowed.includes(visibility as KnowledgeDocumentVisibility)) {
    throw new Error("Ungültige Sichtbarkeit");
  }
  return visibility as KnowledgeDocumentVisibility;
}

export async function uploadKnowledgeDocument(formData: FormData) {
  const profile = await requireKnowledgeManagement();

  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const visibility = parseVisibility(formData.get("visibility"));
  const file = formData.get("file");

  if (!categoryId) throw new Error("Bitte eine Kategorie auswählen");
  if (!title) throw new Error("Titel ist erforderlich");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Bitte eine Datei auswählen");
  }
  if (file.size > KNOWLEDGE_MAX_FILE_SIZE) {
    throw new Error("Datei darf maximal 50 MB groß sein");
  }
  if (!KNOWLEDGE_ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Dateityp nicht erlaubt (PDF, DOCX, XLSX, PPTX)");
  }

  const documentId = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${categoryId}/${documentId}/${safeName}`;

  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from(KNOWLEDGE_CENTER_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { error: insertError } = await supabase.from("knowledge_documents").insert({
    id: documentId,
    category_id: categoryId,
    title,
    description: description || null,
    file_url: storagePath,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
    visibility,
    content_type: "document",
    created_by: profile.id,
  });

  if (insertError) {
    await supabase.storage.from(KNOWLEDGE_CENTER_BUCKET).remove([storagePath]);
    throw new Error(insertError.message);
  }

  revalidateKnowledgeCenter();
}

export async function updateKnowledgeDocument(documentId: string, formData: FormData) {
  await requireKnowledgeManagement();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const visibility = parseVisibility(formData.get("visibility"));
  const sortOrderRaw = String(formData.get("sortOrder") ?? "0").trim();
  const sortOrder = Number.parseInt(sortOrderRaw, 10);

  if (!title) throw new Error("Titel ist erforderlich");
  if (!categoryId) throw new Error("Bitte eine Kategorie auswählen");

  const supabase = await createClient();
  const { error } = await supabase
    .from("knowledge_documents")
    .update({
      title,
      description: description || null,
      category_id: categoryId,
      visibility,
      sort_order: Number.isNaN(sortOrder) ? 0 : sortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (error) throw new Error(error.message);
  revalidateKnowledgeCenter();
}

export async function deleteKnowledgeDocument(documentId: string) {
  await requireKnowledgeManagement();

  const supabase = await createClient();
  const { data: document, error: fetchError } = await supabase
    .from("knowledge_documents")
    .select("file_url")
    .eq("id", documentId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  await supabase.storage
    .from(KNOWLEDGE_CENTER_BUCKET)
    .remove([document.file_url as string]);

  const { error } = await supabase
    .from("knowledge_documents")
    .delete()
    .eq("id", documentId);

  if (error) throw new Error(error.message);
  revalidateKnowledgeCenter();
}

export async function createKnowledgeCategory(formData: FormData) {
  await requireKnowledgeManagement();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const sortOrderRaw = String(formData.get("sortOrder") ?? "0").trim();
  const sortOrder = Number.parseInt(sortOrderRaw, 10);

  if (!name) throw new Error("Name ist erforderlich");

  const slug = slugifyCategoryName(name);
  if (!slug) throw new Error("Ungültiger Kategoriename");

  const supabase = await createClient();
  const { error } = await supabase.from("knowledge_categories").insert({
    name,
    slug,
    description: description || null,
    sort_order: Number.isNaN(sortOrder) ? 0 : sortOrder,
  });

  if (error) throw new Error(error.message);
  revalidateKnowledgeCenter();
}

export async function updateKnowledgeCategory(categoryId: string, formData: FormData) {
  await requireKnowledgeManagement();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const sortOrderRaw = String(formData.get("sortOrder") ?? "0").trim();
  const sortOrder = Number.parseInt(sortOrderRaw, 10);

  if (!name) throw new Error("Name ist erforderlich");

  const supabase = await createClient();
  const { error } = await supabase
    .from("knowledge_categories")
    .update({
      name,
      description: description || null,
      sort_order: Number.isNaN(sortOrder) ? 0 : sortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", categoryId);

  if (error) throw new Error(error.message);
  revalidateKnowledgeCenter();
}

export async function deleteKnowledgeCategory(categoryId: string) {
  await requireKnowledgeManagement();

  const supabase = await createClient();
  const { data: documents, error: docsError } = await supabase
    .from("knowledge_documents")
    .select("file_url")
    .eq("category_id", categoryId);

  if (docsError) throw new Error(docsError.message);

  const storagePaths = (documents ?? []).map((doc) => doc.file_url as string);
  if (storagePaths.length > 0) {
    await supabase.storage.from(KNOWLEDGE_CENTER_BUCKET).remove(storagePaths);
  }

  const { error } = await supabase
    .from("knowledge_categories")
    .delete()
    .eq("id", categoryId);

  if (error) throw new Error(error.message);
  revalidateKnowledgeCenter();
}

export async function getKnowledgeDocumentSignedUrl(
  documentId: string,
  options?: { download?: boolean },
) {
  const profile = await requireKnowledgeCenterAccess();
  const document = await getKnowledgeDocumentById(profile, documentId);
  if (!document) throw new Error("Dokument nicht gefunden oder kein Zugriff");

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(KNOWLEDGE_CENTER_BUCKET)
    .createSignedUrl(document.file_url, 300, {
      download: options?.download ? document.file_name : false,
    });

  if (error) throw new Error(error.message);
  return data.signedUrl;
}
